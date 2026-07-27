import { supabase, query, one } from '../services/supabaseService.js';
import { assertShopAccess } from '../services/accessService.js';
import { intervalsOverlap, validateSlot } from '../services/schedulePolicy.js';
import { HttpError } from '../utils/httpError.js';

const fixedName = (code) => `%${code}%`;

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
  const barbers = await query(
    supabase.from('barbers')
      .select('id,name,shop_name')
      .eq('shop_name', req.user.shopName),
  );
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
    if (String(row.services?.name || '').toLowerCase().includes('parcela')) {
      current.payments.push(row);
    } else {
      current.appointments.push(row);
    }
    current.clientName ||= String(row.client_name || '')
      .replace(/Parcela \d+\/\d+\s+/i, '')
      .replace(code, '')
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
  } = req.body;
  if (![barberId, clientName, startDate, time].every(Boolean)) {
    throw new HttpError(400, 'Dados obrigatorios do cliente fixo ausentes');
  }
  if (!['weekly', 'biweekly', 'monthly'].includes(frequency)) {
    throw new HttpError(400, 'Frequencia invalida');
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
      .select('id,shop_name,work_start,work_end,off_days')
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
  const scheduleService = await query(
    supabase.from('services').insert({
      barber_id: barberId,
      name: `${cleanPackageName} - bloqueio assinatura ${code}`,
      price: 0,
      duration: serviceDuration,
    }).select().single(),
  );
  const paymentService = await query(
    supabase.from('services').insert({
      barber_id: barberId,
      name: `${cleanPackageName} - parcela mensal ${code}`,
      price: value,
      duration: 1,
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
  }));
  const payments = Array.from({ length: monthCount }, (_, index) => ({
    barber_id: barberId,
    service_id: paymentService.id,
    client_name:
      `Parcela ${index + 1}/${monthCount} ${cleanClientName} ${code}`,
    client_phone: cleanPhone,
    date: isoAddMonths(startDate, index),
    time: '00:00',
    status: 'em_carteira',
  }));
  await query(supabase.from('appointments').insert([...schedules, ...payments]));
  res.status(201).json({ code, appointments: schedules.length, payments: payments.length });
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
  const barbers = await query(
    supabase.from('barbers').select('id').eq('shop_name', req.user.shopName),
  );
  if (!barbers.length) throw new HttpError(404, 'Contrato nao encontrado');
  const rows = await query(
    supabase.from('appointments')
      .select('id')
      .in('barber_id', barbers.map((barber) => barber.id))
      .ilike('client_name', fixedName(code)),
  );
  if (!rows.length) throw new HttpError(404, 'Contrato nao encontrado');
  await query(
    supabase.from('appointments')
      .update({ status: 'cancelado' })
      .in('id', rows.map((row) => row.id)),
  );
  res.status(204).end();
}
