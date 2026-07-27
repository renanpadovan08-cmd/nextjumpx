import { supabase, query, one } from '../services/supabaseService.js';
import { intervalsOverlap, validateSlot } from '../services/schedulePolicy.js';
import { HttpError } from '../utils/httpError.js';

const statuses = ['agendado', 'em_carteira', 'encaixe', 'em_andamento', 'bloqueio'];
const barberColumns = 'id,name,phone,shop_name,shop_id,photo_url,background_url,work_start,work_end,lunch_start,lunch_end,off_days,access_status';

function publicBarber(row) {
  return {
    ...row,
    break_start: row.lunch_start || '',
    break_end: row.lunch_end || '',
  };
}

function publicServices(rows) {
  return rows.filter((service) => {
    const name = String(service.name || '').toLowerCase();
    const internalName = ['assinatura', 'parcela', 'mensalidade', 'bloqueio', 'carteira', 'cobranca', 'cobrança']
      .some((marker) => name.includes(marker));
    const technicalBlock = Number(service.price || 0) === 0 && Number(service.duration || 0) >= 240;
    const contractCode = /ZB-[A-Z0-9]{4,}/i.test(String(service.name || ''));
    return !internalName && !technicalBlock && !contractCode;
  });
}

async function activeBarber(id) {
  return publicBarber(await one(
    supabase.from('barbers').select(barberColumns).eq('id', id).in('access_status', ['ativo', 'active']),
    'Profissional indisponivel',
  ));
}

export async function bookingContext(req, res) {
  const owner = publicBarber(await one(
    supabase.from('barbers').select(barberColumns).eq('login', req.params.login).in('access_status', ['ativo', 'active']),
    'Link nao encontrado',
  ));
  let barberBuilder = supabase.from('barbers').select(barberColumns)
    .in('access_status', ['ativo', 'active']).order('created_at');
  barberBuilder = owner.shop_id
    ? barberBuilder.eq('shop_id', owner.shop_id)
    : barberBuilder.eq('shop_name', owner.shop_name);
  const barbers = (await query(barberBuilder)).map(publicBarber);
  const services = barbers.length
    ? publicServices(await query(supabase.from('services').select('*').in('barber_id', barbers.map((barber) => barber.id)).eq('active', true).order('display_order').order('created_at')))
    : [];
  res.json({ owner, barbers, services });
}

export async function availability(req, res) {
  const { barberId, date } = req.query;
  if (!barberId || !date) throw new HttpError(400, 'barberId e date sao obrigatorios');
  await activeBarber(barberId);
  res.json(await query(
    supabase.from('appointments')
      .select('id,time,status,service_id,services(duration)')
      .eq('barber_id', barberId)
      .eq('date', date)
      .in('status', statuses),
  ));
}

export async function schedule(req, res) {
  const {
    barberId, serviceId, clientName, clientPhone = '', date, time,
  } = req.body;
  if (![barberId, serviceId, clientName, date, time].every((value) => String(value || '').trim())) {
    throw new HttpError(400, 'Dados do agendamento incompletos');
  }
  const barber = await activeBarber(barberId);
  const service = await one(
    supabase.from('services').select('id,barber_id,name,duration,price').eq('id', serviceId).eq('barber_id', barber.id).eq('active', true),
    'Servico indisponivel para esse profissional',
  );
  if (!publicServices([service]).length) throw new HttpError(400, 'Esse servico nao esta disponivel no catalogo publico');
  const slotError = validateSlot({ barber, date, time, duration: service.duration });
  if (slotError) throw new HttpError(400, slotError);

  const existing = await query(
    supabase.from('appointments')
      .select('id,time,status,service_id,services(duration)')
      .eq('barber_id', barberId)
      .eq('date', date)
      .in('status', statuses),
  );
  if (existing.some((row) => intervalsOverlap(time, service.duration, row.time, row.services?.duration || 30))) {
    throw new HttpError(409, 'Horario acabou de ser ocupado');
  }
  res.status(201).json(await query(
    supabase.from('appointments').insert({
      barber_id: barberId,
      service_id: serviceId,
      client_name: String(clientName).trim(),
      client_phone: String(clientPhone).trim(),
      date,
      time,
      status: 'agendado',
      shop_id: barber.shop_id || null,
    }).select('*,services(name,price,duration),barbers(name)').single(),
  ));
}
