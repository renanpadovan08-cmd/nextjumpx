import { supabase, query, one } from '../services/supabaseService.js';
import { assertShopAccess } from '../services/accessService.js';
import { HttpError } from '../utils/httpError.js';

const fixedName = (code) => `%${code}%`;
const isoAddMonths = (date, months) => { const value = new Date(`${date}T12:00:00`); value.setMonth(value.getMonth() + months); return value.toISOString().slice(0, 10); };
const isoAddDays = (date, days) => { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + days); return value.toISOString().slice(0, 10); };

export async function list(req, res) {
  const barbers = await query(supabase.from('barbers').select('id,name,shop_name').eq('shop_name', req.user.shopName));
  const ids = barbers.map((item) => item.id);
  const rows = ids.length ? await query(supabase.from('appointments').select('*,services(name,price,duration),barbers(name)').in('barber_id', ids).ilike('client_name', '%ZB-%').order('date')) : [];
  const contracts = new Map();
  for (const row of rows) {
    const code = String(row.client_name || row.services?.name || '').match(/ZB-[A-Z0-9]+/i)?.[0]?.toUpperCase();
    if (!code) continue;
    const current = contracts.get(code) || { code, appointments: [], payments: [], clientName: '', clientPhone: '', barberName: row.barbers?.name || '' };
    if (String(row.services?.name || '').toLowerCase().includes('parcela')) current.payments.push(row); else current.appointments.push(row);
    current.clientName ||= String(row.client_name || '').replace(/Parcela \d+\/\d+\s+/i, '').replace(code, '').trim();
    current.clientPhone ||= row.client_phone || '';
    contracts.set(code, current);
  }
  res.json([...contracts.values()]);
}

export async function create(req, res) {
  const { barberId, clientName, clientPhone = '', packageName = 'Assinatura', startDate, time, duration = 30, frequency = 'weekly', months = 1, monthlyValue = 0 } = req.body;
  if (![barberId, clientName, startDate, time].every(Boolean)) throw new HttpError(400, 'Dados obrigatorios do cliente fixo ausentes');
  const barber = await one(supabase.from('barbers').select('id,shop_name').eq('id', barberId), 'Barbeiro nao encontrado'); assertShopAccess(req.user, barber);
  const code = `ZB-${Date.now().toString(36).toUpperCase()}`;
  const count = Math.max(1, Number(months)) * (frequency === 'weekly' ? 4 : frequency === 'biweekly' ? 2 : 1);
  const gap = frequency === 'weekly' ? 7 : frequency === 'biweekly' ? 14 : 30;
  const scheduleService = await query(supabase.from('services').insert({ barber_id: barberId, name: `${packageName} • bloqueio assinatura ${code}`, price: 0, duration: Number(duration) }).select().single());
  const paymentService = await query(supabase.from('services').insert({ barber_id: barberId, name: `${packageName} • parcela mensal ${code}`, price: Number(monthlyValue), duration: 1 }).select().single());
  const schedules = Array.from({ length: count }, (_, index) => ({ barber_id: barberId, service_id: scheduleService.id, client_name: `${clientName} ${code}`, client_phone: clientPhone, date: frequency === 'monthly' ? isoAddMonths(startDate, index) : isoAddDays(startDate, gap * index), time, status: 'agendado' }));
  const payments = Array.from({ length: Math.max(1, Number(months)) }, (_, index) => ({ barber_id: barberId, service_id: paymentService.id, client_name: `Parcela ${index + 1}/${months} ${clientName} ${code}`, client_phone: clientPhone, date: isoAddMonths(startDate, index), time: '00:00', status: 'em_carteira' }));
  await query(supabase.from('appointments').insert([...schedules, ...payments]));
  res.status(201).json({ code });
}

export async function pay(req, res) { const appointment = await one(supabase.from('appointments').select('*,barbers(shop_name)').eq('id', req.params.id), 'Cobranca nao encontrada'); assertShopAccess(req.user, { id: appointment.barber_id, shop_name: appointment.barbers.shop_name }); res.json(await query(supabase.from('appointments').update({ status: 'concluido' }).eq('id', appointment.id).select().single())); }
export async function cancel(req, res) { const code = req.params.code; await query(supabase.from('appointments').update({ status: 'cancelado' }).ilike('client_name', fixedName(code))); res.status(204).end(); }
