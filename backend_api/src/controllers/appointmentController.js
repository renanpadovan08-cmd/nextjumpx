import { supabase, one, query } from '../services/supabaseService.js';
import { assertShopAccess } from '../services/accessService.js';
import { intervalsOverlap, validateSlot } from '../services/schedulePolicy.js';
import { HttpError } from '../utils/httpError.js';

const activeStatuses = ['agendado', 'em_carteira', 'encaixe', 'em_andamento', 'bloqueio'];
const validStatuses = [...activeStatuses, 'concluido', 'finalizado', 'faltou', 'cancelado'];

async function ensureBarberAccess(user, barberId) {
  const barber = await one(supabase.from('barbers').select('id,shop_name').eq('id', barberId), 'Barbeiro nao encontrado');
  assertShopAccess(user, barber);
  return barber;
}

async function assertNoConflict({ barberId, date, time, serviceId, ignoreId, allowFitIn = false }) {
  const service = await one(
    supabase.from('services').select('id,duration').eq('id', serviceId).eq('barber_id', barberId),
    'Servico nao encontrado para esse profissional',
  );
  const barber = await one(
    supabase.from('barbers').select('id,work_start,work_end,off_days').eq('id', barberId),
    'Barbeiro nao encontrado',
  );
  const slotError = validateSlot({ barber, date, time, duration: service.duration });
  if (slotError) throw new HttpError(400, slotError);
  if (allowFitIn) return;
  const rows = await query(supabase.from('appointments').select('id,time,service_id,services(duration)').eq('barber_id', barberId).eq('date', date).in('status', activeStatuses));
  const collision = rows.some((row) => row.id !== ignoreId
    && intervalsOverlap(time, service.duration, row.time, row.services?.duration || 30));
  if (collision) throw new HttpError(409, 'Esse horário acabou de ser ocupado');
}

export async function listAppointments(req, res) {
  const barberId = req.query.barberId;
  const barber = barberId ? await ensureBarberAccess(req.user, barberId) : null;
  let builder = supabase.from('appointments').select('*,services(name,price,duration),barbers(name,shop_name)').order('date').order('time');
  if (barber) builder = builder.eq('barber_id', barber.id);
  else if (req.user.role !== 'admin') {
    const shopBarbers = await query(
      supabase.from('barbers').select('id').eq('shop_name', req.user.shopName),
    );
    if (!shopBarbers.length) {
      res.json([]);
      return;
    }
    builder = builder.in('barber_id', shopBarbers.map((item) => item.id));
  }
  if (req.query.date) builder = builder.eq('date', req.query.date);
  res.json(await query(builder));
}

export async function availability(req, res) {
  const { barberId, date } = req.query;
  if (!barberId || !date) throw new HttpError(400, 'barberId e date sao obrigatorios');
  await ensureBarberAccess(req.user, barberId);
  const appointments = await query(supabase.from('appointments').select('id,time,status,service_id,services(duration)').eq('barber_id', barberId).eq('date', date).in('status', activeStatuses));
  res.json(appointments);
}

const normalizeAppointmentKey = (key) => {
  switch (key) {
    case 'barberId':
      return 'barber_id';
    case 'serviceId':
      return 'service_id';
    case 'clientName':
      return 'client_name';
    case 'clientPhone':
      return 'client_phone';
    case 'reminderDays':
      return 'reminder_days';
    case 'reminderDate':
      return 'reminder_date';
    default:
      return key;
  }
};

export async function createAppointment(req, res) {
  const {
    barberId,
    serviceId,
    clientName,
    clientPhone,
    date,
    time,
    status = 'agendado',
    reminderDays,
    reminderDate,
  } = req.body;
  if (![barberId, serviceId, clientName, date, time].every(Boolean)) throw new HttpError(400, 'Dados incompletos para o agendamento');
  if (!validStatuses.includes(status)) throw new HttpError(400, 'Status de agendamento invalido');
  await ensureBarberAccess(req.user, barberId);
  await assertNoConflict({ barberId, serviceId, date, time, allowFitIn: status === 'encaixe' });
  res.status(201).json(await query(supabase.from('appointments').insert({
    barber_id: barberId,
    service_id: serviceId,
    client_name: clientName.trim(),
    client_phone: clientPhone?.trim() || '',
    date,
    time,
    status,
    reminder_days: reminderDays,
    reminder_date: reminderDate,
  }).select('*,services(name,price,duration),barbers(name,shop_name)').single()));
}

export async function updateAppointment(req, res) {
  const current = await one(supabase.from('appointments').select('*,barbers(shop_name)').eq('id', req.params.id), 'Agendamento nao encontrado');
  assertShopAccess(req.user, { id: current.barber_id, shop_name: current.barbers.shop_name });
  const allowed = ['barber_id', 'service_id', 'client_name', 'client_phone', 'date', 'time', 'status', 'reminder_days', 'reminder_date', 'cancel_note', 'barberId', 'serviceId', 'clientName', 'clientPhone'];
  const patch = Object.fromEntries(
    Object.entries(req.body)
      .filter(([key]) => allowed.includes(key))
      .map(([key, value]) => [normalizeAppointmentKey(key), value]),
  );
  if (patch.status && !validStatuses.includes(patch.status)) throw new HttpError(400, 'Status de agendamento invalido');
  if (patch.barber_id) await ensureBarberAccess(req.user, patch.barber_id);
  if (patch.barber_id || patch.date || patch.time || patch.service_id) {
    await assertNoConflict({
      barberId: patch.barber_id || current.barber_id,
      serviceId: patch.service_id || current.service_id,
      date: patch.date || current.date,
      time: patch.time || current.time,
      ignoreId: current.id,
      allowFitIn: (patch.status || current.status) === 'encaixe',
    });
  }
  res.json(await query(supabase.from('appointments').update(patch).eq('id', current.id).select('*,services(name,price,duration),barbers(name,shop_name)').single()));
}

export async function deleteAppointment(req, res) {
  const current = await one(supabase.from('appointments').select('*,barbers(shop_name)').eq('id', req.params.id), 'Agendamento nao encontrado');
  assertShopAccess(req.user, { id: current.barber_id, shop_name: current.barbers.shop_name });
  await query(supabase.from('appointments').delete().eq('id', current.id));
  res.status(204).end();
}
