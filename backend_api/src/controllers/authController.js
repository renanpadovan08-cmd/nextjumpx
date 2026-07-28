import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { supabase, one, query } from '../services/supabaseService.js';
import {
  normalizeRole,
  sanitizeBarber,
} from '../services/accessService.js';
import {
  legacyHashPrefix,
  legacyPasswordHash,
  loginLookupValues,
  normalizeLogin,
} from '../services/passwordPolicy.js';
import { HttpError } from '../utils/httpError.js';

const safeColumns = 'id,name,login,phone,shop_name,shop_id,role,photo_url,background_url,work_start,work_end,lunch_start,lunch_end,off_days,commission_rate,access_status,expires_at,created_at,activation_note,must_change_password,accepted_terms,accepted_terms_at,accepted_terms_version';
export const currentTermsVersion = 'v1.0';

async function findBarberByLogin(inputLogin) {
  const normalized = normalizeLogin(inputLogin);
  const values = loginLookupValues(inputLogin);
  const rows = await query(
    supabase.from('barbers').select('*').in('login', values).limit(10),
  );
  const exact = (rows || []).find(
    (row) => normalizeLogin(row.login) === normalized,
  );
  if (exact) return exact;

  // Compatibilidade com cadastros antigos que preservaram maiúsculas.
  const caseInsensitive = await query(
    supabase.from('barbers').select('*').ilike('login', String(inputLogin).trim()).limit(10),
  );
  const candidate = (caseInsensitive || []).find(
    (row) => normalizeLogin(row.login) === normalized,
  );
  if (!candidate) throw new HttpError(404, 'Login ou senha invalidos');
  return candidate;
}

function tokenFor(barber) {
  return jwt.sign({
    id: barber.id,
    name: barber.name,
    login: barber.login,
    role: normalizeRole(barber.role),
    shopName: barber.shop_name,
    shopId: barber.shop_id,
  }, process.env.JWT_SECRET, { expiresIn: '8h' });
}

export async function login(req, res) {
  const { login: inputLogin, password } = req.body;
  if (!inputLogin || !password) throw new HttpError(400, 'Informe login e senha');
  const barber = await findBarberByLogin(inputLogin);
  const accessStatus = String(barber.access_status || 'ativo').toLowerCase();
  if (!['ativo', 'active'].includes(accessStatus)) {
    throw new HttpError(403, 'Acesso pendente ou bloqueado');
  }
  const storedHash = String(barber.password_hash || '');
  const bcryptMatches = storedHash.startsWith('$2')
    ? await bcrypt.compare(password, storedHash)
    : false;
  const browserHashMatches = storedHash.startsWith(legacyHashPrefix)
    && storedHash === legacyPasswordHash(barber.login, password);
  // Legacy records can contain both a stale hash and the original plaintext
  // password. Accept the legacy value once, then immediately replace it with
  // a fresh bcrypt hash and remove the plaintext field.
  const legacyPasswordMatches = barber.password === password;
  const valid = bcryptMatches || browserHashMatches || legacyPasswordMatches;
  if (!valid) throw new HttpError(401, 'Login ou senha invalidos');
  if (!bcryptMatches) {
    await query(supabase.from('barbers').update({ password_hash: await bcrypt.hash(password, 12), password: null }).eq('id', barber.id));
  }
  res.json({ token: tokenFor(barber), user: sanitizeBarber(barber) });
}

export async function signup(req, res) {
  const { name, login: inputLogin, password, phone, shopName, plan = 'mensal' } = req.body;
  if (![name, inputLogin, password, shopName].every((value) => String(value || '').trim())) {
    throw new HttpError(400, 'Nome, login, senha e barbearia sao obrigatorios');
  }
  if (String(password).length < 8) throw new HttpError(400, 'A senha precisa ter ao menos 8 caracteres');
  if (!['mensal', 'trimestral', 'anual'].includes(plan)) throw new HttpError(400, 'Plano selecionado invalido');
  const id = randomUUID();
  const data = await query(supabase.from('barbers').insert({
    id, shop_id: id,
    name: name.trim(), login: inputLogin.trim().toLowerCase(), password_hash: await bcrypt.hash(password, 12),
    phone: phone?.trim() || '', shop_name: shopName.trim(), role: 'gerente', access_status: 'pendente', must_change_password: false,
    activation_note: `Plano escolhido: ${plan} | aguardando contato/liberacao`,
  }).select(safeColumns).single());
  res.status(201).json(sanitizeBarber(data));
}

export async function me(req, res) {
  const barber = await one(supabase.from('barbers').select(safeColumns).eq('id', req.user.id), 'Usuario nao encontrado');
  res.json(sanitizeBarber(barber));
}

export async function changePassword(req, res) {
  const { password } = req.body;
  if (!password || String(password).length < 8) {
    throw new HttpError(400, 'A nova senha precisa ter ao menos 8 caracteres');
  }
  await one(
    supabase.from('barbers').select('id').eq('id', req.user.id),
    'Usuario nao encontrado',
  );
  await query(
    supabase.from('barbers').update({
      password_hash: await bcrypt.hash(String(password), 12),
      password: null,
      must_change_password: false,
    }).eq('id', req.user.id),
  );
  res.status(204).end();
}

export async function acceptTerms(req, res) {
  if (req.body?.accepted !== true || req.body?.responsibilityConfirmed !== true) {
    throw new HttpError(400, 'Confirme as duas declarações para continuar');
  }
  const updated = await query(
    supabase.from('barbers').update({
      accepted_terms: true,
      accepted_terms_at: new Date().toISOString(),
      accepted_terms_version: currentTermsVersion,
    }).eq('id', req.user.id).select(safeColumns).single(),
  );
  res.json(sanitizeBarber(updated));
}
