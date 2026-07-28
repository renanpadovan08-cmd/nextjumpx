import { supabase, query, one } from '../services/supabaseService.js';
import { assertShopAccess } from '../services/accessService.js';
import {
  businessNow,
  intervalsOverlap,
  validateSlot,
} from '../services/schedulePolicy.js';
import { isInternalPayment } from '../services/servicePolicy.js';
import { HttpError } from '../utils/httpError.js';

const fixedName = (code) => `%${code}%`;
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

export async function list(req, res) {
  let barberBuilder = supabase.from('barbers').select('id,name,shop_name,shop_id');
  barberBuilder = req.user.shopId
    ? barberBuilder.eq('shop_id', req.user.shopId)
    : barberBuilder.eq('shop_name', req.user.shopName);
  const barbers = await query(barberBuilder);
  const ids = barbers.map((item) => item.id);
  const rows = ids.length
    ? await query(
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
    const code = String(row.client_name || row.services?.name || '')
      .match(/ZB-[A-Z0-9]+/i)?.[0]?.toUpperCase();
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
    current.clientName ||= String(row.client_name || '')
      .replace(/Parcela \d+\/\d+\s+/i, '')
      .replace(/^Recebimento(?:\s+final)?(?:\s+assinatura)?\s*/i, '')
      .replace(code, '')
      .replace(/^[-\s]+/, '')
      .trim();
    current.clientPhone ||= row.client_phone || '';
    contracts.set(code, current);
  }
  res.json([...contracts.values()]);
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
      .select('*,barbers(shop_name)')
      .eq('id', req.params.id),
    'Cobranca nao encontrada',
  );
  assertShopAccess(req.user, {
    id: appointment.barber_id,
    shop_name: appointment.barbers.shop_name,
  });
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

export async function cancel(req, res) {
  const code = String(req.params.code || '').toUpperCase();
  if (!/^ZB-[A-Z0-9]+$/.test(code)) {
    throw new HttpError(400, 'Codigo de contrato invalido');
  }
  let barberBuilder = supabase.from('barbers').select('id');
  barberBuilder = req.user.shopId
    ? barberBuilder.eq('shop_id', req.user.shopId)
    : barberBuilder.eq('shop_name', req.user.shopName);
  const barbers = await query(barberBuilder);
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
