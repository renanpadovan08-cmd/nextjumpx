import { supabase, one, query } from '../services/supabaseService.js';
import {
  canManageShop,
  isAdminRole,
  isRestrictedBarber,
  sameShop,
} from '../services/accessService.js';
import { HttpError } from '../utils/httpError.js';
import {
  businessNow,
  intervalsOverlap,
  scheduleForDate,
  toMinutes,
} from '../services/schedulePolicy.js';
import { isInternalPayment } from '../services/servicePolicy.js';

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
  else if (action === 'bonify') { patch.status = 'bonificado'; patch.received_amount = 0; patch.payment_note = note || 'Bonificado'; }
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
  const rows = await scopedAppointments(user);
  const paid = rows.filter((row) => paidStatuses.includes(row.status));
  const walletAmount = rows
    .filter((row) => row.status === 'em_carteira')
    .reduce((sum, row) =>
      sum + Number(row.received_amount ?? row.services?.price ?? 0), 0);
  let movementBuilder = supabase.from('cash_movements').select('*')
    .order('created_at', { ascending: false });
  movementBuilder = user.shopId
    ? movementBuilder.eq('shop_id', user.shopId)
    : movementBuilder.eq('shop_name', user.shopName);
  const movements = await query(movementBuilder);
  const closedAppointmentIds = new Set(
    movements
      .filter((item) =>
        item.source === 'receipt_snapshot' && item.appointment_id)
      .map((item) => String(item.appointment_id)),
  );
  const receipts = paid.filter((row) =>
    !closedAppointmentIds.has(String(row.id)));
  const openMovements = movements.filter((item) =>
    !item.closed_at
      && !['receipt_snapshot', 'manual_cancelado'].includes(item.source));
  const manual = openMovements
    .filter((item) => ['entrada', 'saida'].includes(item.type))
    .map((item) => ({
    ...item,
    entry_date: String(item.created_at || '').slice(0, 10),
    }));
  const manualIn = manual.filter((item) => item.type === 'entrada')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalOut = openMovements.filter((item) => item.type === 'saida')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const receiptTotal = receipts.reduce((sum, row) =>
    sum + Number(row.received_amount ?? row.services?.price ?? 0), 0);
  let closureBuilder = supabase.from('cash_closures').select('*')
    .order('created_at', { ascending: false })
    .limit(30);
  closureBuilder = user.shopId
    ? closureBuilder.eq('shop_id', user.shopId)
    : closureBuilder.eq('shop_name', user.shopName);
  const closures = await query(closureBuilder);
  const entries = receiptTotal + manualIn;
  return {
    month,
    periodStart: closures[0]?.period_end || null,
    entries,
    commissions: totalOut,
    balance: entries - totalOut,
    walletAmount,
    receipts,
    manual,
    adjustments: openMovements.filter((item) => item.type === 'ajuste'),
    closures,
    openMovementIds: openMovements.map((item) => item.id),
  };
}

export async function createCashEntry(req, res) {
  const { description, amount, type, reason = '' } = req.body;
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
    reason: String(reason || '').trim(),
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
  if (!summary.receipts.length && !summary.openMovementIds.length) {
    throw new HttpError(409, 'Nao ha registros abertos para fechar');
  }
  const periodEnd = today();
  const periodStart = summary.periodStart
    || summary.receipts.map((row) => row.date).sort()[0]
    || periodEnd;
  const fileName = `fechamento-caixa-${periodEnd}.csv`;
  const closure = await query(supabase.from('cash_closures').insert({
    shop_id: req.user.shopId || null,
    shop_name: req.user.shopName,
    period_start: periodStart,
    period_end: periodEnd,
    total_in: summary.entries,
    total_out: summary.commissions,
    balance: summary.balance,
    closed_by: req.user.id,
    closed_by_name: req.user.name || '',
    file_name: fileName,
  }).select().single());
  const closedAt = new Date().toISOString();
  if (summary.openMovementIds.length) {
    await query(
      supabase.from('cash_movements').update({
        closed_at: closedAt,
        cash_closure_id: closure.id,
      }).in('id', summary.openMovementIds),
    );
  }
  if (summary.receipts.length) {
    await query(supabase.from('cash_movements').insert(
      summary.receipts.map((row) => ({
        shop_id: req.user.shopId || null,
        shop_name: req.user.shopName,
        type: 'entrada',
        source: 'receipt_snapshot',
        appointment_id: row.id,
        barber_id: row.barber_id,
        client_name: row.client_name || '',
        description: row.services?.name || 'Recebimento',
        amount: Number(row.received_amount ?? row.services?.price ?? 0),
        created_by: req.user.id,
        created_by_name: req.user.name || '',
        closed_at: closedAt,
        cash_closure_id: closure.id,
      })),
    ));
  }
  const csvRows = [
    ['TIPO', 'DATA', 'CLIENTE/DESCRICAO', 'PROFISSIONAL', 'VALOR'],
    ...summary.receipts.map((row) => [
      'ENTRADA',
      `${row.date} ${row.time || ''}`,
      row.client_name || '',
      row.barbers?.name || '',
      Number(row.received_amount ?? row.services?.price ?? 0),
    ]),
    ...summary.manual.map((row) => [
      row.type === 'entrada' ? 'ENTRADA MANUAL' : 'SAIDA',
      row.entry_date || '',
      row.description || '',
      row.created_by_name || '',
      Number(row.amount || 0),
    ]),
    ...summary.adjustments.map((row) => [
      'ALTERACAO',
      String(row.created_at || '').slice(0, 10),
      `${row.client_name || ''} - ${row.reason || ''}`,
      row.created_by_name || '',
      `${row.old_amount ?? ''} -> ${row.new_amount ?? ''}`,
    ]),
    [],
    ['TOTAL ENTRADAS', '', '', '', summary.entries],
    ['TOTAL SAIDAS', '', '', '', summary.commissions],
    ['SALDO', '', '', '', summary.balance],
  ];
  const csv = csvRows.map((columns) =>
    columns.map((value) =>
      `"${String(value ?? '').replaceAll('"', '""')}"`).join(';')).join('\n');
  res.status(201).json({ ...closure, csv, fileName });
}

export async function updateCashReceipt(req, res) {
  const current = await ownedAppointment(req.user, req.params.id);
  if (!paidStatuses.includes(current.status)) {
    throw new HttpError(409, 'Somente recebimentos concluidos podem ser alterados');
  }
  const amount = Number(req.body.amount);
  const reason = String(req.body.reason || '').trim();
  if (!Number.isFinite(amount) || amount < 0) {
    throw new HttpError(400, 'Informe um valor valido');
  }
  if (!reason) throw new HttpError(400, 'Informe o motivo da alteracao');
  const oldAmount =
    Number(current.received_amount ?? current.services?.price ?? 0);
  const updated = await query(
    supabase.from('appointments').update({
      received_amount: amount,
      payment_note: reason,
    }).eq('id', current.id)
      .select('*,services(name,price,duration),barbers(name)')
      .single(),
  );
  await query(supabase.from('cash_movements').insert({
    shop_id: req.user.shopId || null,
    shop_name: req.user.shopName,
    type: 'ajuste',
    source: 'payment_edit',
    appointment_id: current.id,
    barber_id: current.barber_id,
    client_name: current.client_name || '',
    description: 'Alteracao de recebimento',
    amount: amount - oldAmount,
    old_amount: oldAmount,
    new_amount: amount,
    reason,
    created_by: req.user.id,
    created_by_name: req.user.name || '',
  }));
  res.json(updated);
}

const baseProfileColumns = 'id,name,login,phone,shop_name,shop_id,photo_url,background_url,work_start,work_end,commission_rate,role,access_status,activation_note';
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
  const aliases = {
    photoUrl: 'photo_url',
    backgroundUrl: 'background_url',
    shopName: 'shop_name',
  };
  const allowed = canManageShop(req.user)
    ? ['name', 'phone', 'shop_name', 'photo_url', 'background_url']
    : ['name', 'phone', 'photo_url'];
  const patch = Object.fromEntries(Object.entries(req.body).map(([key, value]) => [aliases[key] || key, value]).filter(([key]) => allowed.includes(key)));
  if (!Object.keys(patch).length) throw new HttpError(400, 'Nenhuma alteracao de perfil informada');
  if (patch.name != null && !String(patch.name).trim()) throw new HttpError(400, 'Informe um nome valido');
  if (patch.shop_name != null) {
    patch.shop_name = String(patch.shop_name).trim();
    if (!patch.shop_name) {
      throw new HttpError(400, 'Informe o nome da barbearia');
    }
    let builder = supabase.from('barbers')
      .update({ shop_name: patch.shop_name });
    if (req.user.shopId) builder = builder.eq('shop_id', req.user.shopId);
    else builder = builder.eq('shop_name', req.user.shopName);
    await query(builder);
  }
  res.json(await updateBarberProfile(req.user.id, patch));
}

export async function hours(req, res) {
  const profile = await fetchBarberProfile(req.user.id);
  const barbers = (await scopedBarbers(req.user)).filter((barber) =>
    !isAdminRole(req.user.role)
      || (req.user.shopId && barber.shop_id === req.user.shopId)
      || (!req.user.shopId && req.user.shopName
        && barber.shop_name === req.user.shopName));
  const closures = barbers.length
    ? await query(
      supabase.from('appointments')
        .select('id,barber_id,date,time,client_name,status,barbers(name)')
        .in('barber_id', barbers.map((barber) => barber.id))
        .eq('status', 'bloqueio')
        .ilike('client_name', 'Agenda fechada%')
        .gte('date', today())
        .order('date')
        .order('time'),
    )
    : [];
  res.json({ ...profile, closures, barbers });
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

const validIsoDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === value;
};

function dateRange(startDate, endDate) {
  const start = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);
  const result = [];
  for (let cursor = start; cursor <= end && result.length <= 366;
    cursor = new Date(cursor.getTime() + 86400000)) {
    result.push(cursor.toISOString().slice(0, 10));
  }
  return result;
}

async function closureService(barber, duration) {
  const existing = await query(
    supabase.from('services')
      .select('id')
      .eq('barber_id', barber.id)
      .eq('duration', duration)
      .ilike('name', 'Agenda fechada%')
      .limit(1),
  );
  if (existing.length) return existing[0].id;
  return (await query(
    supabase.from('services').insert({
      barber_id: barber.id,
      shop_id: barber.shop_id || null,
      name: 'Agenda fechada - bloqueio tecnico',
      price: 0,
      duration,
      active: true,
    }).select('id').single(),
  )).id;
}

export async function createHoursClosure(req, res) {
  const {
    startDate,
    endDate = startDate,
    barberId,
    reason = 'Agenda fechada',
  } = req.body;
  if (!validIsoDate(startDate) || !validIsoDate(endDate)
      || endDate < startDate) {
    throw new HttpError(400, 'Confira a data inicial e final');
  }
  const dates = dateRange(startDate, endDate);
  if (!dates.length || dates.length > 366) {
    throw new HttpError(400, 'O periodo deve ter no maximo 366 dias');
  }
  const availableBarbers = (await scopedBarbers(req.user)).filter((barber) =>
    !isAdminRole(req.user.role)
      || (req.user.shopId && barber.shop_id === req.user.shopId)
      || (!req.user.shopId && req.user.shopName
        && barber.shop_name === req.user.shopName));
  const barbers = barberId
    ? availableBarbers.filter((barber) => barber.id === barberId)
    : availableBarbers;
  if (!barbers.length) throw new HttpError(404, 'Profissional nao encontrado');

  const existing = await query(
    supabase.from('appointments')
      .select('barber_id,date,client_name,status')
      .in('barber_id', barbers.map((barber) => barber.id))
      .in('date', dates)
      .eq('status', 'bloqueio')
      .ilike('client_name', 'Agenda fechada%'),
  );
  const existingKeys = new Set(
    existing.map((row) => `${row.barber_id}|${row.date}`),
  );
  const rows = [];
  for (const barber of barbers) {
    const fullProfile = await fetchBarberProfile(barber.id);
    for (const date of dates) {
      if (existingKeys.has(`${barber.id}|${date}`)) continue;
      const schedule = scheduleForDate(fullProfile, date);
      const start = schedule.start || fullProfile.work_start || '08:00';
      const startMinutes = toMinutes(start);
      const endMinutes = toMinutes(
        schedule.end || fullProfile.work_end || '20:00',
      );
      const duration = Math.max(
        30,
        Number.isFinite(startMinutes) && Number.isFinite(endMinutes)
          ? endMinutes - startMinutes
          : 720,
      );
      rows.push({
        barber_id: barber.id,
        service_id: await closureService(barber, duration),
        client_name:
          `Agenda fechada - ${String(reason || 'Agenda fechada').trim()}`,
        client_phone: '',
        date,
        time: start,
        status: 'bloqueio',
        shop_id: barber.shop_id || req.user.shopId || null,
      });
    }
  }
  if (!rows.length) {
    throw new HttpError(409, 'A agenda ja esta fechada nesse periodo');
  }
  res.status(201).json(await query(
    supabase.from('appointments').insert(rows)
      .select('id,barber_id,date,time,client_name,status'),
  ));
}

export async function deleteHoursClosure(req, res) {
  const current = await ownedAppointment(req.user, req.params.id);
  if (current.status !== 'bloqueio'
      || !String(current.client_name || '').startsWith('Agenda fechada')) {
    throw new HttpError(409, 'Esse registro nao e um fechamento de agenda');
  }
  await query(
    supabase.from('appointments')
      .update({ status: 'cancelado' })
      .eq('id', current.id),
  );
  res.status(204).end();
}

function canSelfBlockAgenda(barber) {
  return canManageShop(barber)
    || String(barber.activation_note || '').toUpperCase().split('|')
      .some((value) => value.trim() === 'AGENDA_SELF_BLOCK=1');
}

export async function createSelfClosure(req, res) {
  const barber = await fetchBarberProfile(req.user.id);
  if (!canSelfBlockAgenda(barber)) {
    throw new HttpError(403, 'Seu gerente ainda nao liberou esta funcao');
  }
  const {
    date,
    start,
    end,
    reason = 'compromisso inesperado',
  } = req.body;
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  const now = businessNow();
  if (!validIsoDate(date)
      || !Number.isFinite(startMinutes)
      || !Number.isFinite(endMinutes)
      || endMinutes <= startMinutes) {
    throw new HttpError(400, 'Confira data, inicio e fim do bloqueio');
  }
  if (date < now.date || (date === now.date && start <= now.time)) {
    throw new HttpError(400, 'Nao e possivel bloquear horario passado');
  }
  const duration = endMinutes - startMinutes;
  const candidates = await query(
    supabase.from('appointments')
      .select('id,time,client_name,client_phone,service_id,services(name,duration)')
      .eq('barber_id', req.user.id)
      .eq('date', date)
      .in('status', openStatuses),
  );
  const affected = candidates.filter((row) =>
    intervalsOverlap(
      start,
      duration,
      row.time,
      row.services?.duration || 30,
    ));
  const serviceId = await closureService(barber, duration);
  const closure = await query(
    supabase.from('appointments').insert({
      barber_id: req.user.id,
      service_id: serviceId,
      client_name:
        `Agenda fechada - Bloqueio do barbeiro - ${String(reason).trim()}`,
      client_phone: '',
      date,
      time: start,
      status: 'bloqueio',
      shop_id: barber.shop_id || req.user.shopId || null,
    }).select('id,barber_id,date,time,client_name,status').single(),
  );
  res.status(201).json({ closure, affected });
}

export async function deleteSelfClosure(req, res) {
  const current = await ownedAppointment(req.user, req.params.id);
  if (current.barber_id !== req.user.id
      || current.status !== 'bloqueio'
      || !String(current.client_name || '')
        .startsWith('Agenda fechada - Bloqueio do barbeiro')) {
    throw new HttpError(403, 'Esse bloqueio nao pertence ao seu perfil');
  }
  await query(
    supabase.from('appointments').update({ status: 'cancelado' })
      .eq('id', current.id),
  );
  res.status(204).end();
}

export async function whatsapp(req, res) {
  const rows = await scopedAppointments(req.user);
  const walletRows = rows.filter((row) => row.status === 'em_carteira');
  const todayRows = rows.filter((row) => openStatuses.includes(row.status) && row.date === today());
  res.json({ today: todayRows, wallet: walletRows });
}

export async function backup(req, res) {
  const scoped = await scopedBarbers(req.user);
  const ids = scoped.map((barber) => barber.id);
  const barbers = ids.length
    ? await query(
      supabase.from('barbers')
        .select('id,name,login,phone,shop_name,shop_id,role,photo_url,background_url,work_start,work_end,lunch_start,lunch_end,off_days,commission_rate,access_status,expires_at,created_at,activation_note')
        .in('id', ids)
        .order('created_at'),
    )
    : [];
  const services = ids.length
    ? await query(
      supabase.from('services').select('*')
        .in('barber_id', ids).order('created_at'),
    )
    : [];
  const appointments = ids.length
    ? await query(
      supabase.from('appointments').select('*')
        .in('barber_id', ids).order('date').order('time'),
    )
    : [];
  let movementsBuilder = supabase.from('cash_movements').select('*')
    .order('created_at');
  let closuresBuilder = supabase.from('cash_closures').select('*')
    .order('created_at');
  if (req.user.shopId) {
    movementsBuilder = movementsBuilder.eq('shop_id', req.user.shopId);
    closuresBuilder = closuresBuilder.eq('shop_id', req.user.shopId);
  } else {
    movementsBuilder = movementsBuilder.eq('shop_name', req.user.shopName);
    closuresBuilder = closuresBuilder.eq('shop_name', req.user.shopName);
  }
  res.json({
    format: 'zenbarber-backup-v2',
    generatedAt: new Date().toISOString(),
    shopId: req.user.shopId || null,
    shopName: req.user.shopName,
    barbers,
    services,
    appointments,
    cashMovements: await query(movementsBuilder),
    cashClosures: await query(closuresBuilder),
  });
}
