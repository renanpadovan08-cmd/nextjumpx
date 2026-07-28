import bcrypt from 'bcryptjs';
import { supabase, one, query } from '../services/supabaseService.js';
import {
  assertShopAccess,
  isBarberRole,
  sanitizeBarber,
} from '../services/accessService.js';
import { HttpError } from '../utils/httpError.js';

const columns = 'id,name,login,phone,shop_name,shop_id,role,photo_url,background_url,work_start,work_end,lunch_start,lunch_end,off_days,commission_rate,access_status,expires_at,created_at,activation_note,must_change_password';

export async function listBarbers(req, res) {
  const shop = req.query.shopName || req.user.shopName;
  if (req.user.role !== 'admin' && shop !== req.user.shopName) throw new HttpError(403, 'Barbearia nao autorizada');
  let builder = supabase.from('barbers').select(columns).order('created_at');
  builder = req.user.shopId && shop === req.user.shopName
    ? builder.eq('shop_id', req.user.shopId)
    : builder.eq('shop_name', shop);
  res.json((await query(builder)).map(sanitizeBarber));
}

export async function publicBarbers(req, res) {
  res.json(await query(
    supabase.from('barbers')
      .select('id,name,phone,shop_name,shop_id,photo_url,work_start,work_end,lunch_start,lunch_end,off_days')
      .eq('shop_name', req.params.shopName)
      .in('access_status', ['ativo', 'active'])
      .order('created_at'),
  ));
}

export async function createBarber(req, res) {
  const { name, login, password, phone, commissionRate = 0, workStart = '08:00', workEnd = '20:00' } = req.body;
  if (!name?.trim() || !login?.trim() || !password) throw new HttpError(400, 'Nome, login e senha sao obrigatorios');
  const data = await query(supabase.from('barbers').insert({ name: name.trim(), login: login.trim().toLowerCase(), password_hash: await bcrypt.hash(password, 12), phone: phone || '', shop_name: req.user.shopName, shop_id: req.user.shopId || null, role: 'barbeiro', access_status: 'ativo', commission_rate: Number(commissionRate), work_start: workStart, work_end: workEnd }).select(columns).single());
  res.status(201).json(sanitizeBarber(data));
}

export async function updateBarber(req, res) {
  const current = await one(supabase.from('barbers').select('*').eq('id', req.params.id), 'Barbeiro nao encontrado');
  assertShopAccess(req.user, current);
  if (isBarberRole(req.user.role) && current.id !== req.user.id) throw new HttpError(403, 'Sem permissao para alterar este perfil');
  const aliases = { photoUrl: 'photo_url', backgroundUrl: 'background_url', workStart: 'work_start', workEnd: 'work_end', offDays: 'off_days', commissionRate: 'commission_rate' };
  const allowed = ['name', 'phone', 'photo_url', 'background_url', 'work_start', 'work_end', 'off_days', 'commission_rate'];
  const patch = Object.fromEntries(Object.entries(req.body).map(([key, value]) => [aliases[key] || key, value]).filter(([key]) => allowed.includes(key)));
  if (isBarberRole(req.user.role)) delete patch.commission_rate;
  if (patch.commission_rate != null && (!Number.isFinite(Number(patch.commission_rate)) || Number(patch.commission_rate) < 0 || Number(patch.commission_rate) > 100)) throw new HttpError(400, 'Comissao deve estar entre 0 e 100');
  const validTime = (value) => value == null || /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value));
  if (!validTime(patch.work_start) || !validTime(patch.work_end)) throw new HttpError(400, 'Horario invalido; use HH:MM');
  if (patch.work_start && patch.work_end && patch.work_start >= patch.work_end) throw new HttpError(400, 'O fim do expediente deve ser posterior ao inicio');
  if (!Object.keys(patch).length) throw new HttpError(400, 'Nenhuma alteracao valida informada');
  res.json(sanitizeBarber(await query(supabase.from('barbers').update(patch).eq('id', current.id).select(columns).single())));
}
