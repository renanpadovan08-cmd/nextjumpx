import { supabase, one, query } from '../services/supabaseService.js';
import { HttpError } from '../utils/httpError.js';

const paidStatuses = ['concluido', 'finalizado'];
const openStatuses = ['agendado', 'encaixe', 'em_andamento'];
const today = () => new Date().toISOString().slice(0, 10);

async function scopedBarbers(user) {
  if (user.role === 'admin') return query(supabase.from('barbers').select('id,name,commission_rate,shop_name').order('name'));
  return query(supabase.from('barbers').select('id,name,commission_rate,shop_name').eq('shop_name', user.shopName).order('name'));
}

async function scopedAppointments(user, select = '*,services(name,price,duration),barbers(name,shop_name)') {
  const barbers = await scopedBarbers(user);
  if (!barbers.length) return [];
  return query(supabase.from('appointments').select(select).in('barber_id', barbers.map((barber) => barber.id)).order('date').order('time'));
}

async function ownedAppointment(user, id) {
  const appointment = await one(supabase.from('appointments').select('*,services(name,price,duration),barbers(name,shop_name)').eq('id', id), 'Lancamento nao encontrado');
  if (user.role !== 'admin' && appointment.barbers?.shop_name !== user.shopName) throw new HttpError(403, 'Lancamento fora da sua barbearia');
  return appointment;
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
  for (const row of rows.filter((item) => paidStatuses.includes(item.status))) {
    const key = `${String(row.client_phone || '').replace(/\D/g, '')}|${String(row.client_name || '').trim().toLowerCase()}`;
    const existing = lastByClient.get(key);
    if (!existing || row.date > existing.date) lastByClient.set(key, row);
  }
  const risk = [...lastByClient.values()].map((row) => ({ ...row, daysAway: Math.max(0, Math.floor((new Date(`${today()}T12:00:00`) - new Date(`${row.date}T12:00:00`)) / 86400000)) })).filter((row) => row.daysAway >= 30).sort((a, b) => b.daysAway - a.daysAway);
  res.json({ risk, recovered: 0, returnRate: 0, zenIndex: risk.length > 5 ? 3 : risk.length > 2 ? 5 : risk.length ? 7 : 10 });
}

export async function cash(req, res) {
  const month = String(req.query.month || today().slice(0, 7));
  const monthEnd = new Date(`${month}-01T12:00:00Z`); monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  const rows = await scopedAppointments(req.user);
  const inMonth = rows.filter((row) => String(row.date || '').startsWith(month));
  const entries = inMonth.filter((row) => paidStatuses.includes(row.status)).reduce((sum, row) => sum + Number(row.received_amount ?? row.services?.price ?? 0), 0);
  const walletAmount = rows.filter((row) => row.status === 'em_carteira').reduce((sum, row) => sum + Number(row.services?.price ?? 0), 0);
  const commissionTotal = (await commissionRows(req.user, month)).reduce((sum, row) => sum + Number(row.commission || 0), 0);
  const manual = await query(supabase.from('cash_entries').select('*').eq('shop_name', req.user.shopName).gte('entry_date', `${month}-01`).lt('entry_date', monthEnd.toISOString().slice(0, 10)).order('entry_date', { ascending: false }));
  const manualIn = manual.filter((item) => item.type === 'entrada').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const manualOut = manual.filter((item) => item.type === 'saida').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  res.json({ month, entries: entries + manualIn, commissions: commissionTotal + manualOut, balance: entries + manualIn - commissionTotal - manualOut, walletAmount, manual });
}

export async function createCashEntry(req, res) {
  const { description, amount, type, entryDate = today() } = req.body;
  if (!String(description || '').trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new HttpError(400, 'Informe descrição e valor positivo');
  if (!['entrada', 'saida'].includes(type)) throw new HttpError(400, 'Tipo de lançamento inválido');
  res.status(201).json(await query(supabase.from('cash_entries').insert({ shop_name: req.user.shopName, description: String(description).trim(), amount: Number(amount), type, entry_date: entryDate, created_by: req.user.id }).select().single()));
}

export async function deleteCashEntry(req, res) {
  const entry = await one(supabase.from('cash_entries').select('id,shop_name').eq('id', req.params.id), 'Lançamento não encontrado');
  if (req.user.role !== 'admin' && entry.shop_name !== req.user.shopName) throw new HttpError(403, 'Lançamento fora da sua barbearia');
  await query(supabase.from('cash_entries').delete().eq('id', entry.id));
  res.status(204).end();
}

const profileColumns = 'id,name,login,phone,shop_name,photo_url,background_url,work_start,work_end,break_start,break_end,off_days,commission_rate,role,access_status';

export async function profile(req, res) {
  res.json(await one(supabase.from('barbers').select(profileColumns).eq('id', req.user.id), 'Perfil nao encontrado'));
}

export async function updateProfile(req, res) {
  const aliases = { photoUrl: 'photo_url', backgroundUrl: 'background_url' };
  const allowed = ['name', 'phone', 'photo_url', 'background_url'];
  const patch = Object.fromEntries(Object.entries(req.body).map(([key, value]) => [aliases[key] || key, value]).filter(([key]) => allowed.includes(key)));
  if (!Object.keys(patch).length) throw new HttpError(400, 'Nenhuma alteracao de perfil informada');
  if (patch.name != null && !String(patch.name).trim()) throw new HttpError(400, 'Informe um nome valido');
  res.json(await query(supabase.from('barbers').update(patch).eq('id', req.user.id).select(profileColumns).single()));
}

export async function hours(req, res) {
  res.json(await one(supabase.from('barbers').select(profileColumns).eq('id', req.user.id), 'Perfil nao encontrado'));
}

export async function updateHours(req, res) {
  const aliases = { workStart: 'work_start', workEnd: 'work_end', breakStart: 'break_start', breakEnd: 'break_end', offDays: 'off_days' };
  const allowed = ['work_start', 'work_end', 'break_start', 'break_end', 'off_days'];
  const patch = Object.fromEntries(Object.entries(req.body).map(([key, value]) => [aliases[key] || key, value]).filter(([key]) => allowed.includes(key)));
  if (!patch.work_start && !patch.work_end && !patch.break_start && !patch.break_end && patch.off_days == null) throw new HttpError(400, 'Nenhum horario informado');
  const validTime = (value) => value == null || value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (![patch.work_start, patch.work_end, patch.break_start, patch.break_end].every(validTime)) throw new HttpError(400, 'Horario invalido; use HH:MM');
  if (patch.work_start && patch.work_end && patch.work_start >= patch.work_end) throw new HttpError(400, 'O fim do expediente deve ser posterior ao inicio');
  res.json(await query(supabase.from('barbers').update(patch).eq('id', req.user.id).select(profileColumns).single()));
}

export async function whatsapp(req, res) {
  const rows = await scopedAppointments(req.user);
  const walletRows = rows.filter((row) => row.status === 'em_carteira');
  const todayRows = rows.filter((row) => openStatuses.includes(row.status) && row.date === today());
  res.json({ today: todayRows, wallet: walletRows });
}
