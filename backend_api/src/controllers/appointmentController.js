import { supabase, one, query } from '../services/supabaseService.js';
import { assertShopAccess } from '../services/accessService.js';
import { HttpError } from '../utils/httpError.js';

const activeStatuses = ['agendado', 'em_carteira', 'encaixe', 'em_andamento', 'bloqueio'];

async function ensureBarberAccess(user, barberId) {
  const barber = await one(supabase.from('barbers').select('id,shop_name').eq('id', barberId), 'Barbeiro nao encontrado');
  assertShopAccess(user, barber);
  return barber;
}

export async function listAppointments(req, res) {
  const barberId = req.query.barberId;
  const barber = barberId ? await ensureBarberAccess(req.user, barberId) : null;
  let builder = supabase.from('appointments').select('*,services(name,price,duration),barbers(name,shop_name)').order('date').order('time');
  if (barber) builder = builder.eq('barber_id', barber.id);
  else if (req.user.role !== 'admin') builder = builder.eq('barbers.shop_name', req.user.shopName);
  if (req.query.date) builder = builder.eq('date', req.query.date);
  res.json(await query(builder));
}

export async function availability(req, res) {
  const { barberId, date } = req.query;
  if (!barberId || !date) throw new HttpError(400, 'barberId e date sao obrigatorios');
  const appointments = await query(supabase.from('appointments').select('id,time,status,service_id,services(duration)').eq('barber_id', barberId).eq('date', date).in('status', activeStatuses));
  res.json(appointments);
}

export async function createAppointment(req, res) {
  const { barberId, serviceId, clientName, clientPhone, date, time, status = 'agendado' } = req.body;
  if (![barberId, serviceId, clientName, date, time].every(Boolean)) throw new HttpError(400, 'Dados incompletos para o agendamento');
  await ensureBarberAccess(req.user, barberId);
  res.status(201).json(await query(supabase.from('appointments').insert({ barber_id: barberId, service_id: serviceId, client_name: clientName.trim(), client_phone: clientPhone?.trim() || '', date, time, status }).select('*,services(name,price,duration)').single()));
}

export async function updateAppointment(req, res) {
  const current = await one(supabase.from('appointments').select('*,barbers(shop_name)').eq('id', req.params.id), 'Agendamento nao encontrado');
  assertShopAccess(req.user, { id: current.barber_id, shop_name: current.barbers.shop_name });
  const allowed = ['barber_id', 'service_id', 'client_name', 'client_phone', 'date', 'time', 'status'];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  if (patch.barber_id) await ensureBarberAccess(req.user, patch.barber_id);
  res.json(await query(supabase.from('appointments').update(patch).eq('id', current.id).select('*,services(name,price,duration)').single()));
}

export async function deleteAppointment(req, res) {
  const current = await one(supabase.from('appointments').select('*,barbers(shop_name)').eq('id', req.params.id), 'Agendamento nao encontrado');
  assertShopAccess(req.user, { id: current.barber_id, shop_name: current.barbers.shop_name });
  await query(supabase.from('appointments').delete().eq('id', current.id));
  res.status(204).end();
}
