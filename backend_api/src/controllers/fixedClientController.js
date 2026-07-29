import {
  supabase,
  query,
  queryAll,
  one,
} from '../services/supabaseService.js';
import { assertShopAccess, isAdminRole } from '../services/accessService.js';
import {
  businessNow,
  intervalsOverlap,
  validateSlot,
} from '../services/schedulePolicy.js';
import { isInternalPayment } from '../services/servicePolicy.js';
import { HttpError } from '../utils/httpError.js';
import { filterBarbersBySelectedUnit } from '../services/unitScopeService.js';

const fixedName = (code) => `%${code}%`;
const contractCode = (value) =>
  String(value || '').match(/ZB-[A-Z0-9]+/i)?.[0]?.toUpperCase() || '';
const isValidIsoDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === value;
};

const isoAddMonths = (date, months) => {
  const [year, month, day] = String(date).split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1, 12));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
};

const isoAddDays = (date, days) => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

function recurringDates(startDate, frequency, months) {
  const end = isoAddMonths(startDate, months);
  if (frequency === 'monthly') {
    return Array.from({ length: months }, (_, index) =>
      isoAddMonths(startDate, index));
  }
  const gap = frequency === 'biweekly' ? 14 : 7;
  const result = [];
  for (let index = 0; index < 200; index += 1) {
    const date = isoAddDays(startDate, gap * index);
    if (date >= end) break;
    result.push(date);
  }
  return result;
}

function appointmentTimestamp(row) {
  return `${row.date || ''} ${String(row.time || '00:00').slice(0, 5)}`;
}

function futureRows(rows) {
  const current = businessNow();
  const now = `${current.date} ${current.time}`;
  return rows.filter((row) => appointmentTimestamp(row) > now);
}

function inferFrequency(rows) {
  const dates = [...new Set(rows.map((row) => row.date).filter(Boolean))].sort();
  if (dates.length < 2) return 'weekly';
  const differences = dates.slice(1).map((date, index) => Math.round(
    (new Date(`${date}T12:00:00Z`) - new Date(`${dates[index]}T12:00:00Z`))
      / 86400000,
  )).sort((a, b) => a - b);
  const median = differences[Math.floor(differences.length / 2)] || 7;
  if (median >= 25) return 'monthly';
  return median >= 10 ? 'biweekly' : 'weekly';
}

function cleanContractLabel(value, code) {
  return String(value || '')
    .replace(/Parcela \d+\/\d+\s+/i, '')
    .replace(/^Recebimento(?:\s+final)?(?:\s+assinatura)?\s*/i, '')
    .replace(code, '')
    .replace(/^[-\s]+/, '')
    .trim();
}

async function scopedShopBarbers(req, select = 'id,name,shop_name,shop_id') {
  let builder = supabase.from('barbers').select(select);
  if (!isAdminRole(req.user.role) || req.user.shopId || req.user.shopName) {
    builder = req.user.shopId
      ? builder.eq('shop_id', req.user.shopId)
      : builder.eq('shop_name', req.user.shopName);
  }
  return filterBarbersBySelectedUnit(req, await query(builder));
}

export async function list(req, res) {
  const barbers = await scopedShopBarbers(req);
  const ids = barbers.map((item) => item.id);
  const rows = ids.length
    ? await queryAll(
      supabase.from('appointments')
        .select('*,services(name,price,duration),barbers(name)')
        .in('barber_id', ids)
        .ilike('client_name', '%ZB-%')
        .neq('status', 'cancelado')
        .order('date'),
    )
    : [];
  const contracts = new Map();
  for (const row of rows) {
    const code = contractCode(row.client_name || row.services?.name);
    if (!code) continue;
    const current = contracts.get(code) || {
      code,
      appointments: [],
      payments: [],
      clientName: '',
      clientPhone: '',
      barberName: row.barbers?.name || '',
    };
    if (isInternalPayment(row)) {
      current.payments.push(row);
    } else {
      current.appointments.push(row);
    }
    current.clientName ||= cleanContractLabel(row.client_name, code);
    current.clientPhone ||= row.client_phone || '';
    contracts.set(code, current);
  }
  res.json([...contracts.values()].map((contract) => {
    const scheduled = [...contract.appointments]
      .sort((a, b) => appointmentTimestamp(a).localeCompare(appointmentTimestamp(b)));
    const futureScheduled = futureRows(
      scheduled.filter((row) => row.status === 'agendado'),
    );
    const pendingPayments = futureRows(
      contract.payments.filter((row) => row.status === 'em_carteira'),
    ).sort((a, b) => appointmentTimestamp(a).localeCompare(appointmentTimestamp(b)));
    const schedule = futureScheduled[0] || scheduled[0] || {};
    const payment = pendingPayments[0] || contract.payments[0] || {};
    const packageName = String(schedule.services?.name || payment.services?.name || '')
      .replace(/\s*[-•]\s*(?:bloqueio assinatura|parcela mensal|parcela semanal|recebimento imediato|recebimento final).*$/i, '')
      .trim();
    return {
      ...contract,
      barberId: schedule.barber_id || payment.barber_id || '',
      packageName: packageName || 'Assinatura',
      startDate: schedule.date || '',
      time: String(schedule.time || '09:00').slice(0, 5),
      duration: Number(schedule.services?.duration || 30),
      frequency: inferFrequency(futureScheduled.length > 1
        ? futureScheduled
        : scheduled),
      firstBillingDate: payment.date || schedule.date || '',
      paymentValue: Number(payment.services?.price || 0),
      editable: futureScheduled.length > 0,
    };
  }));
}

export async function create(req, res) {
  const {
    barberId,
    clientName,
    clientPhone = '',
    packageName = 'Assinatura',
    startDate,
    time,
    duration = 30,
    frequency = 'weekly',
    months = 1,
    monthlyValue = 0,
    paymentMode = 'monthly',
    firstBillingDate,
  } = req.body;
  if (![barberId, clientName, startDate, time].every(Boolean)) {
    throw new HttpError(400, 'Dados obrigatorios do cliente fixo ausentes');
  }
  if (!['weekly', 'biweekly', 'monthly'].includes(frequency)) {
    throw new HttpError(400, 'Frequencia invalida');
  }
  if (!['start', 'end', 'monthly', 'weekly'].includes(paymentMode)) {
    throw new HttpError(400, 'Forma de pagamento invalida');
  }
  if (!isValidIsoDate(startDate)
      || (['monthly', 'weekly'].includes(paymentMode)
        && !isValidIsoDate(firstBillingDate || startDate))) {
    throw new HttpError(400, 'Data da assinatura ou cobranca invalida');
  }
  const monthCount = Number(months);
  const serviceDuration = Number(duration);
  const value = Number(monthlyValue);
  if (!Number.isInteger(monthCount) || monthCount < 1 || monthCount > 36) {
    throw new HttpError(400, 'Informe de 1 a 36 meses');
  }
  if (!Number.isInteger(serviceDuration)
      || serviceDuration < 1
      || serviceDuration > 1440) {
    throw new HttpError(400, 'Duracao invalida');
  }
  if (!Number.isFinite(value) || value < 0) {
    throw new HttpError(400, 'Valor mensal invalido');
  }
  const barber = await one(
    supabase.from('barbers')
      .select('id,shop_name,shop_id,work_start,work_end,lunch_start,lunch_end,off_days')
      .eq('id', barberId),
    'Barbeiro nao encontrado',
  );
  assertShopAccess(req.user, barber);
  if (!(await filterBarbersBySelectedUnit(req, [barber])).length) {
    throw new HttpError(403, 'Barbeiro fora da unidade selecionada');
  }
  const dates = recurringDates(startDate, frequency, monthCount);
  if (!dates.length) {
    throw new HttpError(400, 'Nao foi possivel gerar as recorrencias');
  }
  for (const date of dates) {
    const slotError = validateSlot({
      barber,
      date,
      time,
      duration: serviceDuration,
    });
    if (slotError) throw new HttpError(400, `${date}: ${slotError}`);
  }
  const existing = await query(
    supabase.from('appointments')
      .select('date,time,services(duration)')
      .eq('barber_id', barberId)
      .in('date', dates)
      .in('status',
        ['agendado', 'em_carteira', 'encaixe', 'em_andamento', 'bloqueio']),
  );
  const collision = existing.find((row) =>
    intervalsOverlap(time, serviceDuration,
      row.time, row.services?.duration || 30));
  if (collision) {
    throw new HttpError(
      409,
      `Ja existe um atendimento em ${collision.date} as ${collision.time}`,
    );
  }

  const code = `ZB-${Date.now().toString(36).toUpperCase()}`;
  const cleanPackageName =
      String(packageName || 'Assinatura').trim() || 'Assinatura';
  const cleanClientName = String(clientName).trim();
  const cleanPhone = String(clientPhone).trim();
  const billingStart = String(firstBillingDate || startDate);
  const totalContractValue = value * monthCount;
  const scheduleService = await query(
    supabase.from('services').insert({
      barber_id: barberId,
      name: `${cleanPackageName} - bloqueio assinatura ${code}`,
      price: 0,
      duration: serviceDuration,
      shop_id: barber.shop_id || req.user.shopId || null,
      active: true,
    }).select().single(),
  );
  const paymentDefinition = {
    monthly: {
      name: `${cleanPackageName} - parcela mensal ${code}`,
      price: value,
    },
    weekly: {
      name: `${cleanPackageName} - parcela semanal ${code}`,
      price: value / 4,
    },
    start: {
      name: `${cleanPackageName} - recebimento imediato ${code}`,
      price: totalContractValue,
    },
    end: {
      name: `${cleanPackageName} - recebimento final ${code}`,
      price: totalContractValue,
    },
  }[paymentMode];
  const paymentService = await query(
    supabase.from('services').insert({
      barber_id: barberId,
      name: paymentDefinition.name,
      price: paymentDefinition.price,
      duration: 1,
      shop_id: barber.shop_id || req.user.shopId || null,
      active: true,
    }).select().single(),
  );
  const schedules = dates.map((date) => ({
    barber_id: barberId,
    service_id: scheduleService.id,
    client_name: `${cleanClientName} ${code}`,
    client_phone: cleanPhone,
    date,
    time,
    status: 'agendado',
      shop_id: barber.shop_id || req.user.shopId || null,
    }));
  let payments;
  if (paymentMode === 'monthly') {
    payments = Array.from({ length: monthCount }, (_, index) => ({
      client_name:
        `Parcela ${index + 1}/${monthCount} ${cleanClientName} ${code}`,
      date: isoAddMonths(billingStart, index),
      status: 'em_carteira',
    }));
  } else if (paymentMode === 'weekly') {
    const installmentCount = monthCount * 4;
    payments = Array.from({ length: installmentCount }, (_, index) => ({
      client_name:
        `Parcela ${index + 1}/${installmentCount} ${cleanClientName} ${code}`,
      date: isoAddDays(billingStart, index * 7),
      status: 'em_carteira',
    }));
  } else if (paymentMode === 'end') {
    payments = [{
      client_name: `Recebimento final ${cleanClientName} ${code}`,
      date: dates.at(-1),
      status: 'em_carteira',
    }];
  } else {
    payments = [{
      client_name: `Recebimento assinatura ${cleanClientName} ${code}`,
      date: dates[0],
      status: 'concluido',
    }];
  }
  payments = payments.map((payment) => ({
    ...payment,
    barber_id: barberId,
    service_id: paymentService.id,
    client_phone: cleanPhone,
    time: '00:00',
    reminder_date:
      payment.status === 'em_carteira' ? payment.date : null,
    reminder_days: payment.status === 'em_carteira' ? 0 : null,
    shop_id: barber.shop_id || req.user.shopId || null,
  }));
  await query(supabase.from('appointments').insert([...schedules, ...payments]));
  res.status(201).json({
    code,
    appointments: schedules.length,
    payments: payments.length,
    paymentMode,
  });
}

export async function pay(req, res) {
  const appointment = await one(
    supabase.from('appointments')
      .select('*,barbers(id,shop_name,shop_id)')
      .eq('id', req.params.id),
    'Cobranca nao encontrada',
  );
  assertShopAccess(req.user, {
    id: appointment.barber_id,
    shop_name: appointment.barbers.shop_name,
    shop_id: appointment.barbers.shop_id,
  });
  if (!(await filterBarbersBySelectedUnit(
    req,
    [{ id: appointment.barber_id, ...appointment.barbers }],
  )).length) {
    throw new HttpError(403, 'Cobranca fora da unidade selecionada');
  }
  if (appointment.status !== 'em_carteira') {
    throw new HttpError(409, 'Essa parcela ja foi resolvida');
  }
  res.json(await query(
    supabase.from('appointments')
      .update({ status: 'concluido' })
      .eq('id', appointment.id)
      .select()
      .single(),
  ));
}

export async function update(req, res) {
  const code = String(req.params.code || '').toUpperCase();
  if (!/^ZB-[A-Z0-9]+$/.test(code)) {
    throw new HttpError(400, 'Codigo de contrato invalido');
  }
  const {
    barberId,
    clientName,
    clientPhone = '',
    packageName = 'Assinatura',
    startDate,
    firstBillingDate,
    time,
    duration = 30,
    paymentValue = 0,
  } = req.body;
  if (![barberId, clientName, startDate, time].every(Boolean)) {
    throw new HttpError(400, 'Dados obrigatorios do cliente fixo ausentes');
  }
  if (!isValidIsoDate(startDate)
      || (firstBillingDate && !isValidIsoDate(firstBillingDate))) {
    throw new HttpError(400, 'Data do pacote ou da cobranca invalida');
  }
  const serviceDuration = Number(duration);
  const installmentValue = Number(paymentValue);
  if (!Number.isInteger(serviceDuration)
      || serviceDuration < 1
      || serviceDuration > 1440) {
    throw new HttpError(400, 'Duracao invalida');
  }
  if (!Number.isFinite(installmentValue) || installmentValue < 0) {
    throw new HttpError(400, 'Valor da cobranca invalido');
  }

  const shopBarbers = await scopedShopBarbers(
    req,
    'id,name,shop_name,shop_id,work_start,work_end,lunch_start,lunch_end,off_days',
  );
  const barber = shopBarbers.find((item) => item.id === barberId);
  if (!barber) throw new HttpError(403, 'Barbeiro fora da sua barbearia');
  assertShopAccess(req.user, barber);

  const rows = await query(
    supabase.from('appointments')
      .select('*,services(name,price,duration)')
      .in('barber_id', shopBarbers.map((item) => item.id))
      .ilike('client_name', fixedName(code)),
  );
  if (!rows.length) throw new HttpError(404, 'Contrato nao encontrado');

  const schedules = rows.filter((row) => !isInternalPayment(row));
  const futureSchedules = futureRows(
    schedules.filter((row) => row.status === 'agendado'),
  ).sort((a, b) => appointmentTimestamp(a).localeCompare(appointmentTimestamp(b)));
  if (!futureSchedules.length) {
    throw new HttpError(409, 'Esse contrato nao possui horarios futuros ativos');
  }
  const frequency = inferFrequency(futureSchedules);
  const plannedDates = recurringDates(
    startDate,
    frequency,
    frequency === 'monthly' ? futureSchedules.length : 36,
  ).slice(0, futureSchedules.length);
  if (plannedDates.length !== futureSchedules.length) {
    throw new HttpError(400, 'Nao foi possivel recalcular as recorrencias');
  }
  for (const date of plannedDates) {
    const slotError = validateSlot({
      barber,
      date,
      time,
      duration: serviceDuration,
    });
    if (slotError) throw new HttpError(400, `${date}: ${slotError}`);
  }

  const packageIds = new Set(rows.map((row) => row.id));
  const otherAppointments = await query(
    supabase.from('appointments')
      .select('id,date,time,status,services(duration)')
      .eq('barber_id', barberId)
      .in('date', plannedDates)
      .in('status',
        ['agendado', 'em_carteira', 'encaixe', 'em_andamento', 'bloqueio']),
  );
  for (const date of plannedDates) {
    const collision = otherAppointments.find((row) =>
      !packageIds.has(row.id)
      && row.date === date
      && intervalsOverlap(time, serviceDuration,
        row.time, row.services?.duration || 30));
    if (collision) {
      throw new HttpError(
        409,
        `Ja existe um atendimento em ${collision.date} as ${collision.time}`,
      );
    }
  }

  const cleanName = String(clientName).trim();
  const cleanPhone = String(clientPhone).trim();
  const cleanPackage = String(packageName || 'Assinatura').trim() || 'Assinatura';
  const scheduleServiceIds = [...new Set(schedules.map((row) => row.service_id))];
  const paymentRows = rows.filter((row) => isInternalPayment(row));
  const paymentServiceIds =
    [...new Set(paymentRows.map((row) => row.service_id))];
  const pendingPayments = futureRows(
    paymentRows.filter((row) => row.status === 'em_carteira'),
  ).sort((a, b) => appointmentTimestamp(a).localeCompare(appointmentTimestamp(b)));
  const weeklyPayments = paymentRows.some((row) =>
    /parcela semanal/i.test(row.services?.name || ''));
  const billingStart = firstBillingDate || pendingPayments[0]?.date || startDate;
  const paymentDates = pendingPayments.map((_, index) =>
    weeklyPayments
      ? isoAddDays(billingStart, index * 7)
      : isoAddMonths(billingStart, index));
  const current = businessNow();
  if (paymentDates.some((date) => `${date} 00:00` <= `${current.date} ${current.time}`)) {
    throw new HttpError(400, 'As cobrancas pendentes precisam ficar no futuro');
  }

  for (const serviceId of scheduleServiceIds) {
    await query(supabase.from('services').update({
      name: `${cleanPackage} - bloqueio assinatura ${code}`,
      price: 0,
      duration: serviceDuration,
      barber_id: barberId,
      shop_id: barber.shop_id || req.user.shopId || null,
    }).eq('id', serviceId));
  }
  for (const serviceId of paymentServiceIds) {
    const sample = paymentRows.find((row) => row.service_id === serviceId);
    const suffix = /parcela semanal/i.test(sample?.services?.name || '')
      ? 'parcela semanal'
      : /parcela mensal/i.test(sample?.services?.name || '')
        ? 'parcela mensal'
        : /recebimento final/i.test(sample?.services?.name || '')
          ? 'recebimento final'
          : 'recebimento imediato';
    await query(supabase.from('services').update({
      name: `${cleanPackage} - ${suffix} ${code}`,
      price: installmentValue,
      barber_id: barberId,
      shop_id: barber.shop_id || req.user.shopId || null,
    }).eq('id', serviceId));
  }
  for (let index = 0; index < futureSchedules.length; index += 1) {
    await query(supabase.from('appointments').update({
      client_name: `${cleanName} ${code}`,
      client_phone: cleanPhone,
      barber_id: barberId,
      shop_id: barber.shop_id || req.user.shopId || null,
      date: plannedDates[index],
      time,
    }).eq('id', futureSchedules[index].id));
  }
  for (let index = 0; index < pendingPayments.length; index += 1) {
    const payment = pendingPayments[index];
    const prefix = String(payment.client_name || '').match(/^(Parcela \d+\/\d+)/i)?.[1]
      || (/recebimento final/i.test(payment.client_name || '')
        ? 'Recebimento final'
        : 'Recebimento assinatura');
    await query(supabase.from('appointments').update({
      client_name: `${prefix} ${cleanName} ${code}`,
      client_phone: cleanPhone,
      barber_id: barberId,
      shop_id: barber.shop_id || req.user.shopId || null,
      date: paymentDates[index],
      time: '00:00',
      reminder_date: paymentDates[index],
    }).eq('id', payment.id));
  }
  res.json({
    code,
    updatedAppointments: futureSchedules.length,
    updatedPayments: pendingPayments.length,
  });
}

export async function cancel(req, res) {
  const code = String(req.params.code || '').toUpperCase();
  if (!/^ZB-[A-Z0-9]+$/.test(code)) {
    throw new HttpError(400, 'Codigo de contrato invalido');
  }
  const barbers = await scopedShopBarbers(req, 'id,shop_id,shop_name');
  if (!barbers.length) throw new HttpError(404, 'Contrato nao encontrado');
  const rows = await query(
    supabase.from('appointments')
      .select('id,status,date,time')
      .in('barber_id', barbers.map((barber) => barber.id))
      .ilike('client_name', fixedName(code)),
  );
  if (!rows.length) throw new HttpError(404, 'Contrato nao encontrado');
  const current = businessNow();
  const cancellable = rows.filter((row) =>
    row.status === 'em_carteira'
      || (row.status === 'agendado'
        && (`${row.date} ${String(row.time || '').slice(0, 5)}`
          >= `${current.date} ${current.time}`)));
  if (!cancellable.length) {
    throw new HttpError(409, 'Esse contrato nao possui horarios ou cobrancas futuras');
  }
  await query(
    supabase.from('appointments')
      .update({ status: 'cancelado' })
      .in('id', cancellable.map((row) => row.id)),
  );
  res.status(204).end();
}
