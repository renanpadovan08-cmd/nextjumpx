import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { supabase, one, query } from '../services/supabaseService.js';
import { sanitizeBarber } from '../services/accessService.js';
import { legacyHashPrefix, legacyPasswordHash } from '../services/passwordPolicy.js';
import { HttpError } from '../utils/httpError.js';

const safeColumns = 'id,name,login,phone,shop_name,shop_id,role,photo_url,background_url,work_start,work_end,lunch_start,lunch_end,off_days,commission_rate,access_status,expires_at,created_at,activation_note,must_change_password';

function tokenFor(barber) {
  return jwt.sign({
    id: barber.id,
    name: barber.name,
    login: barber.login,
    role: barber.role === 'admin_master' ? 'admin' : barber.role,
    shopName: barber.shop_name,
    shopId: barber.shop_id,
  }, process.env.JWT_SECRET, { expiresIn: '8h' });
}

export async function login(req, res) {
  const { login: inputLogin, password } = req.body;
  if (!inputLogin || !password) throw new HttpError(400, 'Informe login e senha');
  const barber = await one(supabase.from('barbers').select('*').eq('login', inputLogin.trim()).limit(1), 'Login ou senha invalidos');
  if (!['ativo', 'active'].includes(barber.access_status)) throw new HttpError(403, 'Acesso pendente, bloqueado ou expirado');
  if (barber.expires_at && /^\d{4}-\d{2}-\d{2}$/.test(barber.expires_at) && barber.expires_at < new Date().toISOString().slice(0, 10)) {
    throw new HttpError(403, 'Acesso expirado. Fale com o administrador.');
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
