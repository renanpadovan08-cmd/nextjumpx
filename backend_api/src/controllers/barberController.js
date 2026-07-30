import bcrypt from 'bcryptjs';
import { supabase, one, query } from '../services/supabaseService.js';
import {
  assertShopAccess,
  canManageShop,
  isAdminRole,
  isRestrictedBarber,
  sanitizeBarber,
} from '../services/accessService.js';
import { HttpError } from '../utils/httpError.js';
import { filterBarbersBySelectedUnit } from '../services/unitScopeService.js';
import { validateWeeklyScheduleValue } from '../services/schedulePolicy.js';

const columns = 'id,name,login,phone,shop_name,shop_id,role,photo_url,background_url,work_start,work_end,lunch_start,lunch_end,off_days,commission_rate,access_status,expires_at,created_at,activation_note,must_change_password';

export async function listBarbers(req, res) {
  const shop = req.query.shopName || req.user.shopName;
  if (!isAdminRole(req.user.role) && shop !== req.user.shopName) throw new HttpError(403, 'Barbearia nao autorizada');
  let builder = supabase.from('barbers').select(columns).order('created_at');
  builder = req.user.shopId && shop === req.user.shopName
    ? builder.eq('shop_id', req.user.shopId)
    : builder.eq('shop_name', shop);
  const barbers = await filterBarbersBySelectedUnit(req, await query(builder));
  res.json(barbers.map(sanitizeBarber));
}

export async function publicBarbers(req, res) {
  res.json(await query(
    supabase.from('barbers')
      .select('id,name,phone,shop_name,shop_id,role,photo_url,work_start,work_end,lunch_start,lunch_end,off_days')
      .eq('shop_name', req.params.shopName)
      .in('role', ['barber', 'barbeiro'])
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
  if (isRestrictedBarber(req.user) && current.id !== req.user.id) throw new HttpError(403, 'Sem permissao para alterar este perfil');
  const aliases = { photoUrl: 'photo_url', backgroundUrl: 'background_url', workStart: 'work_start', workEnd: 'work_end', breakStart: 'lunch_start', breakEnd: 'lunch_end', offDays: 'off_days', commissionRate: 'commission_rate' };
  const allowed = [
    'name',
    'phone',
    'photo_url',
    'background_url',
    'work_start',
    'work_end',
    'lunch_start',
    'lunch_end',
    'off_days',
    'commission_rate',
    ...(canManageShop(req.user) ? ['login', 'role', 'password'] : []),
  ];
  const patch = Object.fromEntries(Object.entries(req.body).map(([key, value]) => [aliases[key] || key, value]).filter(([key]) => allowed.includes(key)));
  if (canManageShop(req.user) && req.body.canSelfBlock != null) {
    const flag = 'AGENDA_SELF_BLOCK=1';
    const parts = String(current.activation_note || '')
      .split('|')
      .map((value) => value.trim())
      .filter((value) =>
        value && value.toUpperCase() !== flag);
    if (req.body.canSelfBlock === true) parts.push(flag);
    patch.activation_note = parts.join(' | ');
  }
  if (isRestrictedBarber(req.user)) delete patch.commission_rate;
  if (patch.login != null) {
    patch.login = String(patch.login).trim().toLowerCase()
      .replace(/\s+/g, '-');
    if (!patch.login) throw new HttpError(400, 'Informe um login valido');
  }
  if (patch.role != null) {
    const role = String(patch.role).trim().toLowerCase();
    if (!['barber', 'barbeiro', 'gerente', 'recepcionista'].includes(role)) {
      throw new HttpError(400, 'Perfil de acesso invalido');
    }
    patch.role = role === 'barbeiro' ? 'barber' : role;
  }
  if (patch.password != null) {
    const password = String(patch.password);
    delete patch.password;
    if (password) {
      if (password.length < 8) {
        throw new HttpError(400, 'A nova senha precisa ter ao menos 8 caracteres');
      }
      patch.password_hash = await bcrypt.hash(password, 12);
      patch.password = null;
      patch.must_change_password = false;
    }
  }
  if (patch.commission_rate != null && (!Number.isFinite(Number(patch.commission_rate)) || Number(patch.commission_rate) < 0 || Number(patch.commission_rate) > 100)) throw new HttpError(400, 'Comissao deve estar entre 0 e 100');
  const validTime = (value) =>
    value == null
      || value === ''
      || /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value));
  if (![patch.work_start, patch.work_end, patch.lunch_start, patch.lunch_end].every(validTime)) throw new HttpError(400, 'Horario invalido; use HH:MM');
  if (patch.work_start && patch.work_end && patch.work_start >= patch.work_end) throw new HttpError(400, 'O fim do expediente deve ser posterior ao inicio');
  if (Boolean(patch.lunch_start) !== Boolean(patch.lunch_end)) {
    throw new HttpError(400, 'Informe o inicio e o fim da pausa');
  }
  if (patch.lunch_start && patch.lunch_end
      && (patch.lunch_start >= patch.lunch_end
        || (patch.work_start && patch.lunch_start < patch.work_start)
        || (patch.work_end && patch.lunch_end > patch.work_end))) {
    throw new HttpError(400, 'A pausa deve ficar dentro do expediente');
  }
  const scheduleError = validateWeeklyScheduleValue(patch.off_days);
  if (scheduleError) throw new HttpError(400, scheduleError);
  if (!Object.keys(patch).length) throw new HttpError(400, 'Nenhuma alteracao valida informada');
  res.json(sanitizeBarber(await query(supabase.from('barbers').update(patch).eq('id', current.id).select(columns).single())));
}
