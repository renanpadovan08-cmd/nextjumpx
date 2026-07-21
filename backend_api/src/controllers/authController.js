import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase, one, query } from '../services/supabaseService.js';
import { sanitizeBarber } from '../services/accessService.js';
import { HttpError } from '../utils/httpError.js';

const safeColumns = 'id,name,login,phone,shop_name,role,photo_url,background_url,work_start,work_end,off_days,commission_rate,access_status,expires_at,created_at,activation_note,must_change_password';

function tokenFor(barber) {
  return jwt.sign({ id: barber.id, role: barber.role === 'admin_master' ? 'admin' : barber.role, shopName: barber.shop_name }, process.env.JWT_SECRET, { expiresIn: '8h' });
}

export async function login(req, res) {
  const { login: inputLogin, password } = req.body;
  if (!inputLogin || !password) throw new HttpError(400, 'Informe login e senha');
  const barber = await one(supabase.from('barbers').select('*').eq('login', inputLogin.trim()).limit(1), 'Login ou senha invalidos');
  if (barber.access_status !== 'ativo') throw new HttpError(403, 'Acesso pendente, bloqueado ou expirado');
  const valid = barber.password_hash
    ? await bcrypt.compare(password, barber.password_hash)
    : barber.password === password;
  if (!valid) throw new HttpError(401, 'Login ou senha invalidos');
  if (!barber.password_hash) {
    await query(supabase.from('barbers').update({ password_hash: await bcrypt.hash(password, 12), password: null }).eq('id', barber.id));
  }
  res.json({ token: tokenFor(barber), user: sanitizeBarber(barber) });
}

export async function signup(req, res) {
  const { name, login: inputLogin, password, phone, shopName } = req.body;
  if (![name, inputLogin, password, shopName].every((value) => String(value || '').trim())) {
    throw new HttpError(400, 'Nome, login, senha e barbearia sao obrigatorios');
  }
  const data = await query(supabase.from('barbers').insert({
    name: name.trim(), login: inputLogin.trim().toLowerCase(), password_hash: await bcrypt.hash(password, 12),
    phone: phone?.trim() || '', shop_name: shopName.trim(), role: 'gerente', access_status: 'pendente', must_change_password: false,
  }).select(safeColumns).single());
  res.status(201).json(sanitizeBarber(data));
}

export async function me(req, res) {
  const barber = await one(supabase.from('barbers').select(safeColumns).eq('id', req.user.id), 'Usuario nao encontrado');
  res.json(sanitizeBarber(barber));
}
