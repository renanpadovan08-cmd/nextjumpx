import { supabase, one, query } from '../services/supabaseService.js';
import {
  canManageShop,
  isAdminRole,
  isRestrictedBarber,
  sameShop,
} from '../services/accessService.js';
import { HttpError } from '../utils/httpError.js';
import { businessNow } from '../services/schedulePolicy.js';

const paidStatuses = ['concluido', 'finalizado'];
const openStatuses = ['agendado', 'encaixe', 'em_andamento'];
const today = () => businessNow().date;

async function scopedBarbers(user) {
  if (isAdminRole(user.role)) return query(supabase.from('barbers').select('id,name,commission_rate,shop_name,shop_id').order('name'));
  let builder = supabase.from('barbers').select('id,name,commission_rate,shop_name,shop_id').order('name');
  if (isRestrictedBarber(user)) builder = builder.eq('id', user.id);
  else if (user.shopId) builder = builder.eq('shop_id', user.shopId);
  else builder = builder.eq('shop_name', user.shopName);
  return query(builder);
}

async function scopedAppointments(user, select = '*,services(name,price,duration),barbers(name,shop_name,shop_id)') {
  const barbers = await scopedBarbers(user);
  if (!barbers.length) return [];
  return query(supabase.from('appointments').select(select).in('barber_id', barbers.map((barber) => barber.id)).order('date').order('time'));
}

async function ownedAppointment(user, id) {
  const appointment = await one(supabase.from('appointments').select('*,services(name,price,duration),barbers(name,shop_name,shop_id)').eq('id', id), 'Lancamento nao encontrado');
  if (!isAdminRole(user.role) && !sameShop(user, appointment.barbers || {})) throw new HttpError(403, 'Lancamento fora da sua barbearia');
  return appointment;
}

function isInternalPayment(row) {
  const serviceName = String(row.services?.name || '').toLowerCase();
  return row.time === '00:00'
    && /parcela|mensalidade|cobranca|cobrança/.test(serviceName)
    && /ZB-[A-Z0-9]+/i.test(`${row.client_name || ''} ${serviceName}`);
}

export async function wallet(req, res) {
  const rows = await scopedAppointments(req.user);
  res.json(rows.filter((row) => row.status === 'em_carteira'));
}

export async function walletAction(req, res) {
  const current = await ownedAppointment(req.user, req.params.id);
  if (current.status !== 'em_carteira') throw new HttpError(409, 'Esse lancamento nao esta mais na carteira');
  const { action, amount, reminderDays, note = '' } = req.body;
  const patch = { payment_note: String(note || '') };
  if (action === 'received') patch.status = 'concluido';
  else if (action === 'bonify') { patch.status = 'concluido'; patch.received_amount = 0; patch.payment_note = note || 'Bonificado'; }
  else if (action === 'cancel') patch.status = 'cancelado';
  else if (action === 'adjust') {
    if (!Number.isFinite(Number(amount)) || Number(amount) < 0) throw new HttpError(400, 'Informe um valor valido');
    patch.received_amount = Number(amount);
  } else if (action === 'remind') {
    const days = Number(reminderDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) throw new HttpError(400, 'Informe de 1 a 365 dias para o lembrete');
    const reminder = new Date();
    reminder.setDate(reminder.getDate() + days);
    patch.reminder_days = days;
    patch.reminder_date = reminder.toISOString().slice(0, 10);
  } else throw new HttpError(400, 'Acao de carteira invalida');
  res.json(await query(supabase.from('appointments').update(patch).eq('id', current.id).select('*,services(name,price,duration)').single()));
}

export async function pending(req, res) {
  const rows = await scopedAppointments(req.user);
  res.json(rows.filter((row) => openStatuses.includes(row.status) && row.date < today()));
}

export async function pendingAction(req, res) {
  const current = await ownedAppointment(req.user, req.params.id);
  if (!openStatuses.includes(current.status)) throw new HttpError(409, 'Esse atendimento ja foi resolvido');
  const { action, reminderDays = 15 } = req.body;
  const patch = {};
  if (action === 'received') patch.status = 'concluido';
  else if (action === 'no_show') patch.status = 'faltou';
  else if (action === 'wallet') {
    const days = Number(reminderDays);
    patch.status = 'em_carteira';
    patch.reminder_days = Number.isInteger(days) && days > 0 ? days : 15;
    const reminder = new Date(); reminder.setDate(reminder.getDate() + patch.reminder_days);
    patch.reminder_date = reminder.toISOString().slice(0, 10);
  } else throw new HttpError(400, 'Acao de pendencia invalida');
  res.json(await query(supabase.from('appointments').update(patch).eq('id', current.id).select('*,services(name,price,duration)').single()));
}

async function commissionRows(user, month) {
  const barbers = await scopedBarbers(user);
  const appointments = await scopedAppointments(user);
  const rows = appointments.filter((row) => paidStatuses.includes(row.status) && String(row.date).startsWith(month));
  return barbers.map((barber) => {
    const done = rows.filter((row) => row.barber_id === barber.id);
    const gross = done.reduce((sum, row) => sum + Number(row.received_amount ?? row.services?.price ?? 0), 0);
    const commission = gross * Number(barber.commission_rate || 0) / 100;
    return { ...barber, appointments: done.length, gross, commission, profit: gross - commission };
  });
}

export async function commissions(req, res) {
  const month = String(req.query.month || today().slice(0, 7));
  res.json(await commissionRows(req.user, month));
}

export async function retention(req, res) {
  const rows = await scopedAppointments(req.user);
  const lastByClient = new Map();
  for (const row of rows.filter((item) =>
    paidStatuses.includes(item.status) && !isInternalPayment(item))) {
    const key = `${String(row.client_phone || '').replace(/\D/g, '')}|${String(row.client_name || '').trim().toLowerCase()}`;
    const existing = lastByClient.get(key);
    if (!existing || row.date > existing.date) lastByClient.set(key, row);
  }
  let actions = [];
  let actionBuilder = supabase.from('client_retention_actions').select('*');
  actionBuilder = req.user.shopId
    ? actionBuilder.eq('shop_id', req.user.shopId)
    : actionBuilder.eq('shop_name', req.user.shopName);
  const actionResult = await actionBuilder;
  if (!actionResult.error) actions = actionResult.data || [];
  else if (actionResult.error.code !== '42P01'
      && !/Could not find the table/i.test(String(actionResult.error.message))) {
    throw new HttpError(400, actionResult.error.message);
  }
  const recoveredKeys = new Set(actions.filter((action) => action.action === 'recuperado').map((action) => action.client_key));
  const risk = [...lastByClient.values()].map((row) => {
    const clientKey = `${String(row.client_phone || '').replace(/\D/g, '')}|${String(row.client_name || '').trim().toLowerCase()}`;
    return {
      ...row,
      clientKey,
      daysAway: Math.max(0, Math.floor((new Date(`${today()}T12:00:00`) - new Date(`${row.date}T12:00:00`)) / 86400000)),
    };
  }).filter((row) => row.daysAway >= 30 && !recoveredKeys.has(row.clientKey)).sort((a, b) => b.daysAway - a.daysAway);
  const recovered = recoveredKeys.size;
  const eligible = risk.length + recovered;
  const returnRate = eligible ? Math.round((recovered / eligible) * 100) : 0;
  res.json({ risk, recovered, returnRate, zenIndex: risk.length > 5 ? 3 : risk.length > 2 ? 5 : risk.length ? 7 : 10 });
}

export async function retentionAction(req, res) {
  const {
    clientKey, clientName = '', clientPhone = '', action = 'contacted',
    daysAway = 0, barberId = null,
  } = req.body;
  if (!String(clientKey || '').trim()) throw new HttpError(400, 'Cliente de retencao invalido');
  if (!['contacted', 'recovered'].includes(action)) throw new HttpError(400, 'Acao de retencao invalida');
  try {
    res.status(201).json(await query(
      supabase.from('client_retention_actions').insert({
        shop_id: req.user.shopId || null,
        shop_name: req.user.shopName,
        client_key: String(clientKey).trim(),
        client_name: String(clientName).trim(),
        client_phone: String(clientPhone).trim(),
        barber_id: barberId,
        action: action === 'recovered' ? 'recuperado' : 'whatsapp',
        status_level: Number(daysAway) >= 60 ? 'vermelho' : Number(daysAway) >= 45 ? 'laranja' : 'amarelo',
        days_without_return: Math.max(0, Number(daysAway) || 0),
        created_by: req.user.id,
      }).select().single(),
    ));
  } catch (error) {
    if (/Could not find the table/i.test(String(error.message))) {
      throw new HttpError(400, 'Atualize o banco para habilitar as acoes de retencao');
    }
    throw error;
  }
}

export async function cash(req, res) {
  const month = String(req.query.month || today().slice(0, 7));
  res.json(await cashSummary(req.user, month));
}

async function cashSummary(user, month) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new HttpError(400, 'Mes invalido; use AAAA-MM');
  const monthEnd = new Date(`${month}-01T12:00:00Z`);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  const rows = await scopedAppointments(user);
  const inMonth = rows.filter((row) => String(row.date || '').startsWith(month));
  const entries = inMonth
    .filter((row) => paidStatuses.includes(row.status))
    .reduce((sum, row) =>
      sum + Number(row.received_amount ?? row.services?.price ?? 0), 0);
  const walletAmount = rows
    .filter((row) => row.status === 'em_carteira')
    .reduce((sum, row) =>
      sum + Number(row.received_amount ?? row.services?.price ?? 0), 0);
  const commissionTotal = (await commissionRows(user, month))
    .reduce((sum, row) => sum + Number(row.commission || 0), 0);
  let movementBuilder = supabase.from('cash_movements').select('*')
    .eq('source', 'manual')
    .gte('created_at', `${month}-01T00:00:00-03:00`)
    .lt('created_at', `${monthEnd.toISOString().slice(0, 10)}T00:00:00-03:00`)
    .order('created_at', { ascending: false });
  movementBuilder = user.shopId
    ? movementBuilder.eq('shop_id', user.shopId)
    : movementBuilder.eq('shop_name', user.shopName);
  const movements = await query(movementBuilder);
  const manual = movements.map((item) => ({
    ...item,
    entry_date: String(item.created_at || '').slice(0, 10),
  }));
  const manualIn = manual.filter((item) => item.type === 'entrada')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const manualOut = manual.filter((item) => item.type === 'saida')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  let closureBuilder = supabase.from('cash_closures').select('*')
    .gte('period_start', `${month}-01`)
    .lt('period_start', monthEnd.toISOString().slice(0, 10))
    .order('created_at', { ascending: false });
  closureBuilder = user.shopId
    ? closureBuilder.eq('shop_id', user.shopId)
    : closureBuilder.eq('shop_name', user.shopName);
  const closures = await query(closureBuilder);
  return {
    month,
    entries: entries + manualIn,
    commissions: commissionTotal + manualOut,
    balance: entries + manualIn - commissionTotal - manualOut,
    walletAmount,
    manual,
    closures,
  };
}

export async function createCashEntry(req, res) {
  const { description, amount, type } = req.body;
  if (!String(description || '').trim()
      || !Number.isFinite(Number(amount))
      || Number(amount) <= 0) {
    throw new HttpError(400, 'Informe descricao e valor positivo');
  }
  if (!['entrada', 'saida'].includes(type)) {
    throw new HttpError(400, 'Tipo de lancamento invalido');
  }
  res.status(201).json(await query(supabase.from('cash_movements').insert({
    shop_id: req.user.shopId || null,
    shop_name: req.user.shopName,
    type,
    source: 'manual',
    description: String(description).trim(),
    amount: Number(amount),
    created_by: req.user.id,
    created_by_name: req.user.name || '',
  }).select().single()));
}

export async function deleteCashEntry(req, res) {
  const entry = await one(
    supabase.from('cash_movements')
      .select('id,shop_id,shop_name,amount,source')
      .eq('id', req.params.id),
    'Lancamento nao encontrado',
  );
  if (!isAdminRole(req.user.role) && !sameShop(req.user, entry)) {
    throw new HttpError(403, 'Lancamento fora da sua barbearia');
  }
  if (entry.source !== 'manual') {
    throw new HttpError(409, 'Somente lancamentos manuais podem ser cancelados');
  }
  await query(supabase.from('cash_movements').update({
    source: 'manual_cancelado',
    old_amount: entry.amount,
    new_amount: 0,
    reason: 'Lancamento cancelado pelo usuario',
  }).eq('id', entry.id));
  res.status(204).end();
}

export async function createCashClosure(req, res) {
  const month = String(req.body.month || today().slice(0, 7));
  const summary = await cashSummary(req.user, month);
  const periodEnd = new Date(`${month}-01T12:00:00Z`);
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
  periodEnd.setUTCDate(0);
  res.status(201).json(await query(supabase.from('cash_closures').insert({
    shop_id: req.user.shopId || null,
    shop_name: req.user.shopName,
    period_start: `${month}-01`,
    period_end: periodEnd.toISOString().slice(0, 10),
    total_in: summary.entries,
    total_out: summary.commissions,
    balance: summary.balance,
    closed_by: req.user.id,
    closed_by_name: req.user.name || '',
    file_name: `fechamento-${month}.csv`,
  }).select().single()));
}

const baseProfileColumns = 'id,name,login,phone,shop_name,photo_url,background_url,work_start,work_end,commission_rate,role,access_status';
const profileColumns = `${baseProfileColumns},lunch_start,lunch_end,off_days`;

function isLegacyProfileSchemaError(message) {
  return /column barbers\.(lunch_start|lunch_end|off_days) does not exist/i.test(String(message));
}

function normalizeProfile(row) {
  return {
    ...row,
    break_start: row.lunch_start || '',
    break_end: row.lunch_end || '',
  };
}

async function fetchBarberProfile(id) {
  try {
    return normalizeProfile(await one(supabase.from('barbers').select(profileColumns).eq('id', id), 'Perfil nao encontrado'));
  } catch (error) {
    if (isLegacyProfileSchemaError(error.message)) {
      return await one(supabase.from('barbers').select(baseProfileColumns).eq('id', id), 'Perfil nao encontrado');
    }
    throw error;
  }
}

async function updateBarberProfile(id, patch) {
  try {
    return await query(supabase.from('barbers').update(patch).eq('id', id).select(profileColumns).single());
  } catch (error) {
    if (isLegacyProfileSchemaError(error.message)) {
      return await query(supabase.from('barbers').update(patch).eq('id', id).select(baseProfileColumns).single());
    }
    throw error;
  }
}

export async function profile(req, res) {
  res.json(await fetchBarberProfile(req.user.id));
}

export async function updateProfile(req, res) {
  const aliases = { photoUrl: 'photo_url', backgroundUrl: 'background_url' };
  const allowed = canManageShop(req.user)
    ? ['name', 'phone', 'photo_url', 'background_url']
    : ['name', 'phone', 'photo_url'];
  const patch = Object.fromEntries(Object.entries(req.body).map(([key, value]) => [aliases[key] || key, value]).filter(([key]) => allowed.includes(key)));
  if (!Object.keys(patch).length) throw new HttpError(400, 'Nenhuma alteracao de perfil informada');
  if (patch.name != null && !String(patch.name).trim()) throw new HttpError(400, 'Informe um nome valido');
  res.json(await updateBarberProfile(req.user.id, patch));
}

export async function hours(req, res) {
  res.json(await fetchBarberProfile(req.user.id));
}

export async function updateHours(req, res) {
  const aliases = { workStart: 'work_start', workEnd: 'work_end', breakStart: 'lunch_start', breakEnd: 'lunch_end', break_start: 'lunch_start', break_end: 'lunch_end', offDays: 'off_days' };
  const allowed = ['work_start', 'work_end', 'lunch_start', 'lunch_end', 'off_days'];
  const patch = Object.fromEntries(Object.entries(req.body).map(([key, value]) => [aliases[key] || key, value]).filter(([key]) => allowed.includes(key)));
  if (!patch.work_start && !patch.work_end && !patch.lunch_start && !patch.lunch_end && patch.off_days == null) throw new HttpError(400, 'Nenhum horario informado');
  const validTime = (value) => value == null || value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (![patch.work_start, patch.work_end, patch.lunch_start, patch.lunch_end].every(validTime)) throw new HttpError(400, 'Horario invalido; use HH:MM');
  if (patch.work_start && patch.work_end && patch.work_start >= patch.work_end) throw new HttpError(400, 'O fim do expediente deve ser posterior ao inicio');

  try {
    let builder = supabase.from('barbers').update(patch);
    if (req.user.shopId) builder = builder.eq('shop_id', req.user.shopId);
    else if (req.user.shopName) builder = builder.eq('shop_name', req.user.shopName);
    else builder = builder.eq('id', req.user.id);
    await query(builder);
    res.json(await fetchBarberProfile(req.user.id));
  } catch (error) {
    if (isLegacyProfileSchemaError(error.message)) {
      const legacyPatch = Object.fromEntries(Object.entries(patch).filter(([key]) => !['lunch_start', 'lunch_end', 'off_days'].includes(key)));
      if (!Object.keys(legacyPatch).length) throw new HttpError(400, 'Horas de intervalo nao sao compativeis com esta versao do banco de dados');
      let legacyBuilder = supabase.from('barbers').update(legacyPatch);
      if (req.user.shopId) legacyBuilder = legacyBuilder.eq('shop_id', req.user.shopId);
      else if (req.user.shopName) legacyBuilder = legacyBuilder.eq('shop_name', req.user.shopName);
      else legacyBuilder = legacyBuilder.eq('id', req.user.id);
      await query(legacyBuilder);
      res.json(await fetchBarberProfile(req.user.id));
      return;
    }
    throw error;
  }
}

export async function whatsapp(req, res) {
  const rows = await scopedAppointments(req.user);
  const walletRows = rows.filter((row) => row.status === 'em_carteira');
  const todayRows = rows.filter((row) => openStatuses.includes(row.status) && row.date === today());
  res.json({ today: todayRows, wallet: walletRows });
}
