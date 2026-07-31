import {
  supabase,
  one,
  query,
  queryAll,
} from '../services/supabaseService.js';
import {
  canManageShop,
  isAdminRole,
  isRestrictedBarber,
  sameShop,
  shopOwnerIdFromUser,
} from '../services/accessService.js';
import { HttpError } from '../utils/httpError.js';
import {
  cashPasswordMatches,
  issueCashToken,
} from '../services/cashPasswordPolicy.js';
import {
  cashAuditCsv,
  cashAuditSummary,
  nextMonthOccurrence,
} from '../services/cashAuditPolicy.js';
import {
  businessNow,
  intervalsOverlap,
  scheduleForDate,
  toMinutes,
  validateWeeklyScheduleValue,
} from '../services/schedulePolicy.js';
import { isInternalPayment } from '../services/servicePolicy.js';
import { parseDecimal } from '../services/numberPolicy.js';
import {
  filterBarbersBySelectedUnit,
  selectedUnitId,
} from '../services/unitScopeService.js';
import {
  executePage,
  pageOptions,
  pagePayload,
  wantsPagination,
} from '../services/pagination.js';

const paidStatuses = ['concluido', 'finalizado'];
const openStatuses = ['agendado', 'encaixe', 'em_andamento'];
const today = () => businessNow().date;
const addDaysIso = (date, days) => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

async function scopedBarbers(req) {
  const { user } = req;
  let builder = supabase.from('barbers').select(
    'id,name,commission_rate,shop_name,shop_id,work_start,work_end,lunch_start,lunch_end,off_days',
  ).order('name');
  if (isAdminRole(user.role)) {
    // Administradores globais podem selecionar qualquer unidade valida.
  } else if (isRestrictedBarber(user)) builder = builder.eq('id', user.id);
  else if (user.shopId) builder = builder.eq('shop_id', user.shopId);
  else builder = builder.eq('shop_name', user.shopName);
  return filterBarbersBySelectedUnit(req, await query(builder));
}

async function scopedAppointments(req, {
  select = '*,services(name,price,duration),barbers(name,shop_name,shop_id)',
  filter,
} = {}) {
  const barbers = await scopedBarbers(req);
  if (!barbers.length) return [];
  let builder = supabase.from('appointments').select(select)
    .in('barber_id', barbers.map((barber) => barber.id));
  if (filter) builder = filter(builder);
  return queryAll(
    builder.order('date').order('time'),
  );
}

async function scopedAppointmentsPage(req, {
  select = '*,services(name,price,duration),barbers(name,shop_name,shop_id)',
  filter,
} = {}) {
  const options = pageOptions(req.query);
  const barbers = await scopedBarbers(req);
  if (!barbers.length) return pagePayload([], 0, options);
  let builder = supabase.from('appointments')
    .select(select, { count: 'exact' })
    .in('barber_id', barbers.map((barber) => barber.id));
  if (filter) builder = filter(builder);
  return executePage(builder.order('date').order('time'), options);
}

async function ownedAppointment(req, id) {
  const { user } = req;
  const appointment = await one(supabase.from('appointments').select('*,services(name,price,duration),barbers(name,shop_name,shop_id)').eq('id', id), 'Lancamento nao encontrado');
  if (!isAdminRole(user.role) && !sameShop(user, appointment.barbers || {})) throw new HttpError(403, 'Lancamento fora da sua barbearia');
  const allowedBarbers = await scopedBarbers(req);
  if (!allowedBarbers.some((barber) => barber.id === appointment.barber_id)) {
    throw new HttpError(403, 'Lancamento fora da unidade selecionada');
  }
  return appointment;
}

export async function wallet(req, res) {
  if (wantsPagination(req.query)) {
    res.json(await scopedAppointmentsPage(req, {
      filter: (builder) => builder.eq('status', 'em_carteira'),
    }));
    return;
  }
  res.json(await scopedAppointments(req, {
    filter: (builder) => builder.eq('status', 'em_carteira'),
  }));
}

export async function walletAction(req, res) {
  const current = await ownedAppointment(req, req.params.id);
  if (current.status !== 'em_carteira') throw new HttpError(409, 'Esse lancamento nao esta mais na carteira');
  const { action, amount, reminderDays, note = '' } = req.body;
  const patch = { payment_note: String(note || '') };
  if (action === 'received') patch.status = 'concluido';
  else if (action === 'bonify') { patch.status = 'bonificado'; patch.received_amount = 0; patch.payment_note = note || 'Bonificado'; }
  else if (action === 'cancel') patch.status = 'cancelado';
  else if (action === 'adjust') {
    const parsedAmount = parseDecimal(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) throw new HttpError(400, 'Informe um valor valido');
    patch.received_amount = parsedAmount;
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
  if (wantsPagination(req.query)) {
    res.json(await scopedAppointmentsPage(req, {
      filter: (builder) =>
        builder.in('status', openStatuses).lt('date', today()),
    }));
    return;
  }
  res.json(await scopedAppointments(req, {
    filter: (builder) => builder.in('status', openStatuses).lt('date', today()),
  }));
}

export async function pendingAction(req, res) {
  const current = await ownedAppointment(req, req.params.id);
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

async function commissionRows(req, month) {
  const barbers = await scopedBarbers(req);
  const monthStart = `${month}-01`;
  const nextMonth = new Date(`${monthStart}T12:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const rows = await scopedAppointments(req, {
    filter: (builder) => builder
      .in('status', paidStatuses)
      .gte('date', monthStart)
      .lt('date', nextMonth.toISOString().slice(0, 10)),
  });
  return barbers.map((barber) => {
    const done = rows.filter((row) => row.barber_id === barber.id);
    const gross = done.reduce((sum, row) => sum + Number(row.received_amount ?? row.services?.price ?? 0), 0);
    const commission = gross * Number(barber.commission_rate || 0) / 100;
    return { ...barber, appointments: done.length, gross, commission, profit: gross - commission };
  });
}

export async function commissions(req, res) {
  const month = String(req.query.month || today().slice(0, 7));
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new HttpError(400, 'Mes invalido; use AAAA-MM');
  }
  res.json(await commissionRows(req, month));
}

export async function retention(req, res) {
  const paginated = wantsPagination(req.query);
  const pagination = pageOptions(req.query);
  const rows = await scopedAppointments(req, {
    filter: (builder) => builder.in('status', [
      ...paidStatuses,
      ...openStatuses,
      'faltou',
      'cancelado',
    ]),
  });
  const completed = rows.filter((item) =>
    paidStatuses.includes(item.status)
      && !isInternalPayment(item)
      && !String(item.client_name || '').startsWith('Agenda fechada'));
  const clients = new Map();
  for (const row of completed) {
    const key = `${String(row.client_phone || '').replace(/\D/g, '')}|${String(row.client_name || '').trim().toLowerCase()}`;
    const client = clients.get(key) || {
      clientKey: key,
      appointments: [],
      totalSpend: 0,
    };
    client.appointments.push(row);
    client.totalSpend +=
      Number(row.received_amount ?? row.services?.price ?? 0);
    clients.set(key, client);
  }
  const clientRows = [...clients.values()].map((client) => {
    const history = [...client.appointments].sort((a, b) =>
      `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    const row = history.at(-1);
    const daysAway = Math.max(0, Math.floor(
      (new Date(`${today()}T12:00:00Z`) - new Date(`${row.date}T12:00:00Z`))
        / 86400000,
    ));
    const status = daysAway <= 15
      ? { level: 'verde', label: 'Cliente ativo' }
      : daysAway <= 25
        ? { level: 'amarelo', label: 'Em atencao' }
        : daysAway <= 35
          ? { level: 'laranja', label: 'Alto risco' }
          : { level: 'vermelho', label: 'Cliente perdido' };
    return {
      ...row,
      clientKey: client.clientKey,
      daysAway,
      statusLevel: status.level,
      statusLabel: status.label,
      visits: history.length,
      totalSpend: client.totalSpend,
      averageSpend: history.length ? client.totalSpend / history.length : 0,
      _history: history,
    };
  }).sort((a, b) => b.daysAway - a.daysAway);
  const serializeClient = ({ _history, ...client }) => ({
    ...client,
    history: [..._history].reverse().map((item) => ({
        id: item.id,
        date: item.date,
        time: item.time,
        service: item.services?.name || '',
        value: Number(
          item.received_amount ?? item.services?.price ?? 0,
        ),
        barber: item.barbers?.name || '',
      })),
  });
  const currentMonth = today().slice(0, 7);
  const recovered = [...clients.values()].filter((client) => {
    const history = [...client.appointments].sort((a, b) =>
      `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    if (history.length < 2) return false;
    const last = history.at(-1);
    const previous = history.at(-2);
    const gap = Math.floor(
      (new Date(`${last.date}T12:00:00Z`)
        - new Date(`${previous.date}T12:00:00Z`)) / 86400000,
    );
    return String(last.date).startsWith(currentMonth) && gap >= 26;
  }).length;
  const active = clientRows.filter((row) => row.daysAway <= 15).length;
  const riskCount =
    clientRows.filter((row) => row.daysAway >= 16 && row.daysAway <= 35).length;
  const lost = clientRows.filter((row) => row.daysAway >= 36).length;
  const returnRate = clientRows.length
    ? Math.round(((active + recovered) / clientRows.length) * 100)
    : 0;
  const barbers = await scopedBarbers(req);
  const todayRows = rows.filter((row) =>
    row.date === today()
      && ['agendado', 'encaixe', 'em_andamento', 'concluido', 'finalizado']
        .includes(row.status)
      && !String(row.client_name || '').startsWith('Agenda fechada'));
  const totalSlots = barbers.reduce((sum, barber) => {
    const schedule = scheduleForDate(barber, today());
    if (!schedule.open) return sum;
    const start = toMinutes(schedule.start);
    const end = toMinutes(schedule.end);
    return sum + (Number.isFinite(start) && Number.isFinite(end)
      ? Math.max(1, Math.floor((end - start) / 30))
      : 0);
  }, 0);
  const occupation = totalSlots
    ? Math.min(100, Math.round(todayRows.length / totalSlots * 100))
    : 0;
  const last30 = addDaysIso(today(), -30);
  const recent = rows.filter((row) =>
    row.date >= last30
      && !String(row.client_name || '').startsWith('Agenda fechada'));
  const attendanceBase =
    recent.filter((row) => paidStatuses.includes(row.status)
      || ['faltou', 'cancelado'].includes(row.status));
  const attendance = attendanceBase.length
    ? Math.round(attendanceBase.filter((row) =>
      paidStatuses.includes(row.status)).length / attendanceBase.length * 100)
    : 100;
  const monthRevenue = completed
    .filter((row) => String(row.date).startsWith(currentMonth))
    .reduce((sum, row) =>
      sum + Number(row.received_amount ?? row.services?.price ?? 0), 0);
  const revenueScore = Math.min(
    100,
    Math.round(monthRevenue / Math.max(1200, barbers.length * 3000) * 100),
  );
  const retentionScore = clientRows.length
    ? Math.round((active + Math.round(riskCount * 0.35) + recovered)
      / clientRows.length * 100)
    : 100;
  const zenIndex = Math.round(
    retentionScore * 0.4
      + occupation * 0.2
      + revenueScore * 0.2
      + attendance * 0.2,
  );
  const offset = (pagination.page - 1) * pagination.pageSize;
  const riskRows = paginated
    ? clientRows.slice(offset, offset + pagination.pageSize)
    : clientRows;
  res.json({
    risk: riskRows.map(serializeClient),
    active,
    atRisk: riskCount,
    lost,
    recovered,
    returnRate,
    zenIndex,
    components: {
      retention: retentionScore,
      occupation,
      revenue: revenueScore,
      attendance,
    },
    ...(paginated
      ? {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: clientRows.length,
          totalPages: Math.max(
            1,
            Math.ceil(clientRows.length / pagination.pageSize),
          ),
          hasNext:
            pagination.page * pagination.pageSize < clientRows.length,
        }
      : {}),
  });
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
  res.json(await cashSummary(req, month));
}

function scopeCashBuilder(req, builder) {
  builder = req.user.shopId
    ? builder.eq('shop_id', req.user.shopId)
    : builder.eq('shop_name', req.user.shopName);
  const unitId = selectedUnitId(req);
  return unitId ? builder.eq('unit_id', unitId) : builder;
}

async function optionalCashRows(builder) {
  const { data, error } = await builder;
  if (error?.code === '42P01') return [];
  if (error) throw new HttpError(400, error.message);
  return data || [];
}

async function ensureCashAuditAvailable() {
  const { error } = await supabase.from('cash_audit_logs')
    .select('id')
    .limit(1);
  if (error?.code === '42P01') {
    throw new HttpError(
      409,
      'Execute a migração de auditoria do caixa antes desta operação',
    );
  }
  if (error) throw new HttpError(400, error.message);
}

function cashSnapshot(entry) {
  return {
    id: entry.id || null,
    type: entry.type || '',
    description: entry.description || '',
    amount: Number(entry.amount || 0),
    reason: entry.reason || '',
    source: entry.source || '',
    recurring_entry_id: entry.recurring_entry_id || null,
  };
}

async function recordCashAudit(req, {
  movementId = null,
  recurringEntryId = null,
  unitId = selectedUnitId(req),
  action,
  before = {},
  after = {},
  reason = '',
}) {
  const row = {
    shop_id: req.user.shopId || null,
    shop_name: req.user.shopName,
    ...(unitId ? { unit_id: unitId } : {}),
    movement_id: movementId,
    recurring_entry_id: recurringEntryId,
    action,
    summary: cashAuditSummary({
      action,
      actorName: req.user.name,
      before,
      after,
    }),
    old_data: before,
    new_data: after,
    reason: String(reason || '').trim(),
    actor_id: req.user.id,
    actor_name: req.user.name || req.user.login || 'Usuário',
    actor_role: req.user.role || '',
  };
  const { data, error } = await supabase.from('cash_audit_logs')
    .insert(row)
    .select()
    .single();
  if (error?.code === '42P01') {
    throw new HttpError(
      409,
      'Execute a migração de auditoria do caixa antes de alterar lançamentos',
    );
  }
  if (error) throw new HttpError(400, error.message);
  return data;
}

async function cashAuditRows(req, { from, to, limit = 200 } = {}) {
  let builder = supabase.from('cash_audit_logs').select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  builder = scopeCashBuilder(req, builder);
  if (from) builder = builder.gte('created_at', `${from}T00:00:00-03:00`);
  if (to) builder = builder.lt('created_at', `${to}T00:00:00-03:00`);
  return optionalCashRows(builder);
}

async function cashRecurringRows(req, { dueOnly = false } = {}) {
  let builder = supabase.from('cash_recurring_entries').select('*')
    .eq('active', true)
    .order('next_run_date');
  builder = scopeCashBuilder(req, builder);
  if (dueOnly) builder = builder.lte('next_run_date', today());
  return optionalCashRows(builder);
}

async function materializeRecurringCashEntries(req) {
  const recurrences = await cashRecurringRows(req, { dueOnly: true });
  for (const recurrence of recurrences) {
    let dueDate = String(recurrence.next_run_date || '');
    let generated = 0;
    while (dueDate && dueDate <= today() && generated < 36) {
      const recurringMonth = dueDate.slice(0, 7);
      const movement = {
        shop_id: recurrence.shop_id || null,
        shop_name: recurrence.shop_name,
        ...(recurrence.unit_id ? { unit_id: recurrence.unit_id } : {}),
        type: recurrence.type,
        source: 'recurring',
        description: recurrence.description,
        amount: recurrence.amount,
        reason: recurrence.reason || 'Lançamento recorrente mensal',
        recurring_entry_id: recurrence.id,
        recurring_month: recurringMonth,
        created_by: recurrence.created_by,
        created_by_name: recurrence.created_by_name || 'Recorrência automática',
        created_at: `${dueDate}T12:00:00-03:00`,
      };
      const { error } = await supabase.from('cash_movements').insert(movement);
      if (error && error.code !== '23505') {
        throw new HttpError(400, error.message);
      }
      dueDate = nextMonthOccurrence(dueDate, recurrence.day_of_month);
      generated += 1;
    }
    if (generated) {
      await query(supabase.from('cash_recurring_entries').update({
        next_run_date: dueDate,
        last_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', recurrence.id));
    }
  }
}

async function cashSummary(req, month) {
  const { user } = req;
  if (!/^\d{4}-\d{2}$/.test(month)) throw new HttpError(400, 'Mes invalido; use AAAA-MM');
  await materializeRecurringCashEntries(req);
  const rows = await scopedAppointments(req, {
    filter: (builder) => builder.in(
      'status',
      [...paidStatuses, 'em_carteira'],
    ),
  });
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
  const unitId = selectedUnitId(req);
  if (unitId) movementBuilder = movementBuilder.eq('unit_id', unitId);
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
  if (unitId) closureBuilder = closureBuilder.eq('unit_id', unitId);
  const closures = await query(closureBuilder);
  const [audits, recurrences] = await Promise.all([
    cashAuditRows(req, { from: addDaysIso(today(), -30) }),
    cashRecurringRows(req),
  ]);
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
    audits,
    recurrences,
    closures,
    openMovementIds: openMovements.map((item) => item.id),
  };
}

async function cashAccessSetting(user) {
  let builder = supabase.from('cash_access_settings')
    .select('id,password_hash')
    .limit(1);
  builder = user.shopId
    ? builder.eq('shop_id', user.shopId)
    : builder.eq('shop_name', user.shopName);
  const { data, error } = await builder;
  if (error?.code === '42P01') return null;
  if (error) throw new HttpError(400, error.message);
  return data?.[0] || null;
}

export async function cashAccess(req, res) {
  const setting = await cashAccessSetting(req.user);
  res.json({ configured: Boolean(setting?.password_hash) });
}

export async function unlockCash(req, res) {
  const password = String(req.body.password || '');
  if (!password) throw new HttpError(400, 'Digite a senha do Controle de Caixa');
  const setting = await cashAccessSetting(req.user);
  if (!setting?.password_hash) {
    throw new HttpError(
      409,
      'A senha do caixa ainda nao foi configurada pelo Admin NextJumpX',
    );
  }
  if (!cashPasswordMatches(setting.password_hash, req.user, password)) {
    throw new HttpError(401, 'Senha do caixa incorreta');
  }
  res.json({ token: issueCashToken(req.user), expiresInHours: 8 });
}

export async function createCashEntry(req, res) {
  const {
    description,
    amount,
    type,
    reason = '',
    recurring = false,
    recurringDay,
  } = req.body;
  const parsedAmount = parseDecimal(amount);
  if (!String(description || '').trim()
      || !Number.isFinite(parsedAmount)
      || parsedAmount <= 0) {
    throw new HttpError(400, 'Informe descricao e valor positivo');
  }
  if (!['entrada', 'saida'].includes(type)) {
    throw new HttpError(400, 'Tipo de lancamento invalido');
  }
  const isRecurring = recurring === true || recurring === 'true';
  const dayOfMonth = Number(recurringDay);
  if (isRecurring
      && (type !== 'saida'
        || !Number.isInteger(dayOfMonth)
        || dayOfMonth < 1
        || dayOfMonth > 31)) {
    throw new HttpError(
      400,
      'Despesa recorrente exige um dia mensal entre 1 e 31',
    );
  }
  let recurringEntry = null;
  if (isRecurring) {
    await ensureCashAuditAvailable();
    const { data, error } = await supabase.from('cash_recurring_entries').insert({
      shop_id: req.user.shopId || null,
      shop_name: req.user.shopName,
      ...(selectedUnitId(req) ? { unit_id: selectedUnitId(req) } : {}),
      description: String(description).trim(),
      amount: parsedAmount,
      type,
      reason: String(reason || '').trim(),
      day_of_month: dayOfMonth,
      next_run_date: nextMonthOccurrence(today(), dayOfMonth),
      created_by: req.user.id,
      created_by_name: req.user.name || '',
    }).select().single();
    if (error?.code === '42P01') {
      throw new HttpError(
        409,
        'Execute a migração de auditoria para habilitar despesas recorrentes',
      );
    }
    if (error) throw new HttpError(400, error.message);
    recurringEntry = data;
  }
  const created = await query(supabase.from('cash_movements').insert({
    shop_id: req.user.shopId || null,
    shop_name: req.user.shopName,
    ...(selectedUnitId(req) ? { unit_id: selectedUnitId(req) } : {}),
    type,
    source: isRecurring ? 'recurring' : 'manual',
    description: String(description).trim(),
    amount: parsedAmount,
    reason: String(reason || '').trim(),
    ...(recurringEntry ? {
      recurring_entry_id: recurringEntry.id,
      recurring_month: today().slice(0, 7),
    } : {}),
    created_by: req.user.id,
    created_by_name: req.user.name || '',
  }).select().single());
  if (recurringEntry) {
    try {
      await recordCashAudit(req, {
        movementId: created.id,
        recurringEntryId: recurringEntry.id,
        action: 'recorrencia_criada',
        after: cashSnapshot(created),
        reason: String(reason || '').trim(),
      });
    } catch (error) {
      await query(supabase.from('cash_movements').delete().eq('id', created.id));
      await query(supabase.from('cash_recurring_entries')
        .delete()
        .eq('id', recurringEntry.id));
      throw error;
    }
  }
  res.status(201).json(created);
}

async function ownedCashEntry(req, id) {
  const entry = await one(
    supabase.from('cash_movements')
      .select('*')
      .eq('id', id),
    'Lancamento nao encontrado',
  );
  if (!isAdminRole(req.user.role) && !sameShop(req.user, entry)) {
    throw new HttpError(403, 'Lancamento fora da sua barbearia');
  }
  if (selectedUnitId(req)
      && String(entry.unit_id || '') !== selectedUnitId(req)) {
    throw new HttpError(403, 'Lancamento fora da unidade selecionada');
  }
  return entry;
}

export async function updateCashEntry(req, res) {
  await ensureCashAuditAvailable();
  const entry = await ownedCashEntry(req, req.params.id);
  if (!['manual', 'recurring'].includes(entry.source) || entry.closed_at) {
    throw new HttpError(409, 'Somente lançamentos abertos podem ser alterados');
  }
  const description = String(req.body.description || '').trim();
  const amount = parseDecimal(req.body.amount);
  const type = String(req.body.type || '');
  const note = String(req.body.note ?? entry.reason ?? '').trim();
  const changeReason = String(req.body.changeReason || '').trim();
  if (!description || !Number.isFinite(amount) || amount <= 0) {
    throw new HttpError(400, 'Informe descrição e valor positivo');
  }
  if (!['entrada', 'saida'].includes(type)) {
    throw new HttpError(400, 'Tipo de lançamento inválido');
  }
  if (!changeReason) {
    throw new HttpError(400, 'Informe o motivo da alteração');
  }
  const before = cashSnapshot(entry);
  const updated = await query(supabase.from('cash_movements').update({
    description,
    amount,
    type,
    reason: note,
    updated_at: new Date().toISOString(),
  }).eq('id', entry.id).select().single());
  try {
    await recordCashAudit(req, {
      movementId: entry.id,
      recurringEntryId: entry.recurring_entry_id,
      unitId: entry.unit_id,
      action: 'alteracao',
      before,
      after: cashSnapshot(updated),
      reason: changeReason,
    });
  } catch (error) {
    await query(supabase.from('cash_movements').update({
      description: entry.description,
      amount: entry.amount,
      type: entry.type,
      reason: entry.reason,
      updated_at: entry.updated_at,
    }).eq('id', entry.id));
    throw error;
  }
  res.json(updated);
}

export async function deleteCashEntry(req, res) {
  await ensureCashAuditAvailable();
  const entry = await ownedCashEntry(req, req.params.id);
  if (!['manual', 'recurring'].includes(entry.source) || entry.closed_at) {
    throw new HttpError(409, 'Somente lançamentos abertos podem ser cancelados');
  }
  const deletionReason = String(
    req.body?.reason || 'Lançamento cancelado pelo usuário',
  ).trim();
  await query(supabase.from('cash_movements').update({
    source: 'manual_cancelado',
    old_amount: entry.amount,
    new_amount: 0,
    reason: deletionReason,
    updated_at: new Date().toISOString(),
  }).eq('id', entry.id));
  try {
    await recordCashAudit(req, {
      movementId: entry.id,
      recurringEntryId: entry.recurring_entry_id,
      unitId: entry.unit_id,
      action: 'exclusao',
      before: cashSnapshot(entry),
      reason: deletionReason,
    });
  } catch (error) {
    await query(supabase.from('cash_movements').update({
      source: entry.source,
      old_amount: entry.old_amount,
      new_amount: entry.new_amount,
      reason: entry.reason,
      updated_at: entry.updated_at,
    }).eq('id', entry.id));
    throw error;
  }
  res.status(204).end();
}

export async function disableCashRecurrence(req, res) {
  await ensureCashAuditAvailable();
  let builder = supabase.from('cash_recurring_entries').select('*')
    .eq('id', req.params.id)
    .limit(1);
  builder = scopeCashBuilder(req, builder);
  const rows = await optionalCashRows(builder);
  const recurrence = rows[0];
  if (!recurrence) throw new HttpError(404, 'Recorrência não encontrada');
  const reason = String(req.body?.reason || '').trim();
  if (!reason) throw new HttpError(400, 'Informe o motivo da desativação');
  const updated = await query(supabase.from('cash_recurring_entries').update({
    active: false,
    updated_at: new Date().toISOString(),
  }).eq('id', recurrence.id).select().single());
  try {
    await recordCashAudit(req, {
      recurringEntryId: recurrence.id,
      unitId: recurrence.unit_id,
      action: 'recorrencia_desativada',
      before: cashSnapshot(recurrence),
      after: cashSnapshot(updated),
      reason,
    });
  } catch (error) {
    await query(supabase.from('cash_recurring_entries').update({
      active: true,
      updated_at: recurrence.updated_at,
    }).eq('id', recurrence.id));
    throw error;
  }
  res.json(updated);
}

export async function cashAuditReport(req, res) {
  const month = String(req.query.month || today().slice(0, 7));
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new HttpError(400, 'Mês inválido; use AAAA-MM');
  }
  const nextMonth = nextMonthOccurrence(`${month}-01`, 1).slice(0, 7);
  await ensureCashAuditAvailable();
  let builder = supabase.from('cash_audit_logs').select('*')
    .gte('created_at', `${month}-01T00:00:00-03:00`)
    .lt('created_at', `${nextMonth}-01T00:00:00-03:00`)
    .order('created_at', { ascending: false });
  builder = scopeCashBuilder(req, builder);
  const rows = await queryAll(builder, { maxRows: 20000 });
  res.json({
    month,
    fileName: `auditoria-caixa-${month}.csv`,
    total: rows.length,
    csv: cashAuditCsv(rows),
  });
}

export async function createCashClosure(req, res) {
  const month = String(req.body.month || today().slice(0, 7));
  const summary = await cashSummary(req, month);
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
    ...(selectedUnitId(req) ? { unit_id: selectedUnitId(req) } : {}),
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
        ...(selectedUnitId(req) ? { unit_id: selectedUnitId(req) } : {}),
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
  await ensureCashAuditAvailable();
  const current = await ownedAppointment(req, req.params.id);
  if (!paidStatuses.includes(current.status)) {
    throw new HttpError(409, 'Somente recebimentos concluidos podem ser alterados');
  }
  const amount = parseDecimal(req.body.amount);
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
  const auditMovement = await query(supabase.from('cash_movements').insert({
    shop_id: req.user.shopId || null,
    shop_name: req.user.shopName,
    ...(selectedUnitId(req) ? { unit_id: selectedUnitId(req) } : {}),
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
  }).select().single());
  try {
    await recordCashAudit(req, {
      movementId: auditMovement.id,
      action: 'alteracao',
      before: {
        id: current.id,
        type: 'entrada',
        description: `${current.client_name || 'Recebimento'} • ${current.services?.name || ''}`,
        amount: oldAmount,
        source: 'appointment',
      },
      after: {
        id: current.id,
        type: 'entrada',
        description: `${current.client_name || 'Recebimento'} • ${current.services?.name || ''}`,
        amount,
        source: 'appointment',
      },
      reason,
    });
  } catch (error) {
    await query(supabase.from('cash_movements')
      .delete()
      .eq('id', auditMovement.id));
    await query(supabase.from('appointments').update({
      received_amount: current.received_amount,
      payment_note: current.payment_note,
    }).eq('id', current.id));
    throw error;
  }
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

async function profileResponse(user) {
  const profile = await fetchBarberProfile(user.id);
  if (canManageShop(user)) {
    const ownerId = shopOwnerIdFromUser(user);
    if (ownerId && ownerId !== user.id) {
      const shopOwner = await fetchBarberProfile(ownerId);
      profile.photo_url = shopOwner.photo_url || '';
      profile.background_url = shopOwner.background_url || '';
    }
  }
  return profile;
}

export async function profile(req, res) {
  res.json(await profileResponse(req.user));
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
  if (canManageShop(req.user)) {
    const shopBranding = {};
    if (patch.photo_url != null) shopBranding.photo_url = patch.photo_url;
    if (patch.background_url != null) shopBranding.background_url = patch.background_url;
    delete patch.photo_url;
    delete patch.background_url;
    if (Object.keys(shopBranding).length) {
      await updateBarberProfile(shopOwnerIdFromUser(req.user), shopBranding);
    }
  }
  if (Object.keys(patch).length) {
    await updateBarberProfile(req.user.id, patch);
  }
  res.json(await profileResponse(req.user));
}

async function configurableBarbers(req) {
  return (await scopedBarbers(req)).filter((barber) =>
    !isAdminRole(req.user.role)
      || (req.user.shopId && barber.shop_id === req.user.shopId)
      || (!req.user.shopId && req.user.shopName
        && barber.shop_name === req.user.shopName));
}

export async function hours(req, res) {
  const profile = await fetchBarberProfile(req.user.id);
  const barbers = await configurableBarbers(req);
  const closures = barbers.length
    ? await queryAll(
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
  const targetId = String(req.body.barberId || req.user.id);
  const target = (await configurableBarbers(req))
    .find((barber) => barber.id === targetId);
  if (!target) {
    throw new HttpError(403, 'Profissional fora da sua barbearia ou unidade');
  }

  try {
    await query(supabase.from('barbers').update(patch).eq('id', target.id));
    res.json(await fetchBarberProfile(target.id));
  } catch (error) {
    if (isLegacyProfileSchemaError(error.message)) {
      const legacyPatch = Object.fromEntries(Object.entries(patch).filter(([key]) => !['lunch_start', 'lunch_end', 'off_days'].includes(key)));
      if (!Object.keys(legacyPatch).length) throw new HttpError(400, 'Horas de intervalo nao sao compativeis com esta versao do banco de dados');
      await query(
        supabase.from('barbers').update(legacyPatch).eq('id', target.id),
      );
      res.json(await fetchBarberProfile(target.id));
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
  const availableBarbers = (await scopedBarbers(req)).filter((barber) =>
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
  const current = await ownedAppointment(req, req.params.id);
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
  const current = await ownedAppointment(req, req.params.id);
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
  const tomorrowDate = addDaysIso(today(), 1);
  if (wantsPagination(req.query)) {
    const options = pageOptions(req.query);
    const barbers = await scopedBarbers(req);
    if (!barbers.length) {
      res.json(pagePayload([], 0, options));
      return;
    }
    const barberIds = barbers.map((barber) => barber.id);
    const select =
      '*,services(name,price,duration),barbers(name,shop_name,shop_id)';
    const groups = [
      {
        period: 'Hoje',
        filter: (builder) =>
          builder.in('status', openStatuses).eq('date', today()),
      },
      {
        period: 'Amanha',
        filter: (builder) =>
          builder.in('status', openStatuses).eq('date', tomorrowDate),
      },
      {
        period: 'Carteira',
        filter: (builder) => builder.eq('status', 'em_carteira'),
      },
    ];
    const counts = await Promise.all(groups.map(async (group) => {
      const { count, error } = await group.filter(
        supabase.from('appointments')
          .select('id', { count: 'exact', head: true })
          .in('barber_id', barberIds),
      );
      if (error) throw new HttpError(400, error.message);
      return Number(count || 0);
    }));
    const total = counts.reduce((sum, count) => sum + count, 0);
    let offset = (options.page - 1) * options.pageSize;
    let remaining = options.pageSize;
    const items = [];
    for (let index = 0; index < groups.length && remaining > 0; index += 1) {
      const groupCount = counts[index];
      if (offset >= groupCount) {
        offset -= groupCount;
        continue;
      }
      const take = Math.min(remaining, groupCount - offset);
      const group = groups[index];
      const builder = group.filter(
        supabase.from('appointments')
          .select(select)
          .in('barber_id', barberIds),
      );
      const { data, error } = await builder
        .order('date')
        .order('time')
        .range(offset, offset + take - 1);
      if (error) throw new HttpError(400, error.message);
      items.push(...(data || []).map((row) => ({
        ...row,
        _period: group.period,
      })));
      remaining -= take;
      offset = 0;
    }
    res.json(pagePayload(items, total, options));
    return;
  }
  const [walletRows, scheduleRows] = await Promise.all([
    scopedAppointments(req, {
      filter: (builder) => builder.eq('status', 'em_carteira'),
    }),
    scopedAppointments(req, {
      filter: (builder) => builder
        .in('status', openStatuses)
        .in('date', [today(), tomorrowDate]),
    }),
  ]);
  res.json({
    today: scheduleRows.filter((row) => row.date === today()),
    tomorrow: scheduleRows.filter((row) => row.date === tomorrowDate),
    wallet: walletRows,
  });
}

export async function backup(req, res) {
  const scoped = await scopedBarbers(req);
  const ids = scoped.map((barber) => barber.id);
  const barbers = ids.length
    ? await queryAll(
      supabase.from('barbers')
        .select('id,name,login,phone,shop_name,shop_id,role,photo_url,background_url,work_start,work_end,lunch_start,lunch_end,off_days,commission_rate,access_status,expires_at,created_at,activation_note')
        .in('id', ids)
        .order('created_at'),
    )
    : [];
  const services = ids.length
    ? await queryAll(
      supabase.from('services').select('*')
        .in('barber_id', ids).order('created_at'),
    )
    : [];
  const appointments = ids.length
    ? await queryAll(
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
  const selectedUnit = selectedUnitId(req);
  if (selectedUnit) {
    movementsBuilder = movementsBuilder.eq('unit_id', selectedUnit);
    closuresBuilder = closuresBuilder.eq('unit_id', selectedUnit);
  }
  let units = [];
  let assignments = [];
  const unitsResult = await (req.user.shopId
    ? supabase.from('units').select('*').eq('shop_id', req.user.shopId)
    : supabase.from('units').select('*').eq('shop_name', req.user.shopName));
  if (!unitsResult.error) {
    units = unitsResult.data || [];
    const assignmentResult = await supabase.from('barber_unit_assignments')
      .select('*')
      .in('barber_id', ids);
    if (!assignmentResult.error) assignments = assignmentResult.data || [];
  }
  const active = appointments.filter((row) =>
    ['agendado', 'encaixe', 'em_andamento', 'bloqueio']
      .includes(row.status));
  let conflicts = 0;
  for (let index = 0; index < active.length; index += 1) {
    const first = active[index];
    const firstService = services.find((item) =>
      item.id === first.service_id);
    for (let nextIndex = index + 1; nextIndex < active.length;
      nextIndex += 1) {
      const second = active[nextIndex];
      if (first.barber_id !== second.barber_id
          || first.date !== second.date) continue;
      const secondService = services.find((item) =>
        item.id === second.service_id);
      if (intervalsOverlap(
        first.time,
        firstService?.duration || 30,
        second.time,
        secondService?.duration || 30,
      )) conflicts += 1;
    }
  }
  const audit = [
    {
      key: 'conflicts',
      label: 'Agendamentos conflitantes',
      value: conflicts,
      fix: 'Abra a Agenda e remarque os horarios sobrepostos.',
    },
    {
      key: 'overdue',
      label: 'Agendamentos passados sem baixa',
      value: appointments.filter((row) =>
        openStatuses.includes(row.status) && row.date < today()).length,
      fix: 'Abra Pendencias / Baixa e resolva os atendimentos.',
    },
    {
      key: 'missingPhone',
      label: 'Clientes sem telefone para WhatsApp',
      value: appointments.filter((row) =>
        row.client_name
          && !String(row.client_phone || '').trim()
          && ['agendado', 'encaixe', 'em_carteira'].includes(row.status))
        .length,
      fix: 'Complete o telefone nos agendamentos importantes.',
    },
    {
      key: 'invalidServices',
      label: 'Servicos com cadastro incompleto',
      value: services.filter((service) =>
        !String(service.name || '').trim()
          || Number(service.price || 0) < 0
          || Number(service.duration || 0) <= 0).length,
      fix: 'Revise nome, preco e duracao em Servicos.',
    },
    {
      key: 'missingCommission',
      label: 'Barbeiros sem comissao definida',
      value: barbers.filter((barber) =>
        Number(barber.commission_rate || 0) === 0).length,
      fix: 'Defina as comissoes dos profissionais.',
    },
    {
      key: 'missingUnit',
      label: 'Barbeiros sem unidade vinculada',
      value: units.length
        ? barbers.filter((barber) =>
          !assignments.some((item) => item.barber_id === barber.id)).length
        : 0,
      fix: 'Abra Unidades e vincule cada profissional.',
    },
  ].map((item) => ({ ...item, ok: item.value === 0 }));
  res.json({
    format: 'zenbarber-backup-v2',
    generatedAt: new Date().toISOString(),
    shopId: req.user.shopId || null,
    shopName: req.user.shopName,
    selectedUnitId: selectedUnit || 'all',
    barbers,
    services,
    appointments,
    units,
    barberUnitAssignments: assignments,
    cashMovements: await queryAll(movementsBuilder),
    cashClosures: await queryAll(closuresBuilder),
    audit,
    auditHealthy: audit.every((item) => item.ok),
  });
}
