import { supabase, one, query } from '../services/supabaseService.js';
import { HttpError } from '../utils/httpError.js';

async function ensureServiceAccess(user, serviceId) {
  const current = await one(supabase.from('services').select('*,barbers!inner(id,shop_name)').eq('id', serviceId), 'Servico nao encontrado');
  if (user.role !== 'admin' && current.barbers.shop_name !== user.shopName) throw new HttpError(403, 'Servico fora da sua barbearia');
  return current;
}

export async function listServices(req, res) {
  const barberId = req.query.barberId;
  const builder = supabase.from('services').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: true });
  if (barberId) {
    const barber = await one(supabase.from('barbers').select('id,shop_name').eq('id', barberId), 'Barbeiro nao encontrado');
    if (req.user.role !== 'admin' && barber.shop_name !== req.user.shopName) throw new HttpError(403, 'Barbeiro fora da sua barbearia');
    builder.eq('barber_id', barberId);
  } else if (req.user.role !== 'admin') {
    const barbers = await query(supabase.from('barbers').select('id').eq('shop_name', req.user.shopName));
    builder.in('barber_id', barbers.map((barber) => barber.id));
  }
  res.json(await query(builder));
}

export async function createService(req, res) {
  const { name, price = 0, duration = 30, barberId, iconText, imageUrl } = req.body;
  if (!name?.trim() || !barberId) throw new HttpError(400, 'Nome do servico e barbeiro sao obrigatorios');
  const barber = await one(supabase.from('barbers').select('id,shop_name').eq('id', barberId), 'Barbeiro nao encontrado');
  if (req.user.role !== 'admin' && barber.shop_name !== req.user.shopName) throw new HttpError(403, 'Barbeiro fora da sua barbearia');
  if (!Number.isFinite(Number(price)) || Number(price) < 0) throw new HttpError(400, 'Preco do servico invalido');
  if (!Number.isInteger(Number(duration)) || Number(duration) < 1 || Number(duration) > 1440) throw new HttpError(400, 'Duracao do servico invalida');
  res.status(201).json(await query(supabase.from('services').insert({ barber_id: barberId, name: name.trim(), price: Number(price), duration: Number(duration), icon_text: iconText || '', image_url: imageUrl || null }).select().single()));
}

export async function updateService(req, res) {
  await ensureServiceAccess(req.user, req.params.id);
  const allowed = ['name', 'price', 'duration', 'icon_text', 'image_url', 'display_order'];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  if (patch.name != null && !String(patch.name).trim()) throw new HttpError(400, 'Nome do servico e obrigatorio');
  if (patch.price != null && (!Number.isFinite(Number(patch.price)) || Number(patch.price) < 0)) throw new HttpError(400, 'Preco do servico invalido');
  if (patch.duration != null && (!Number.isInteger(Number(patch.duration)) || Number(patch.duration) < 1 || Number(patch.duration) > 1440)) throw new HttpError(400, 'Duracao do servico invalida');
  if (!Object.keys(patch).length) throw new HttpError(400, 'Nenhuma alteracao valida informada');
  res.json(await query(supabase.from('services').update(patch).eq('id', req.params.id).select().single()));
}

export async function deleteService(req, res) {
  await ensureServiceAccess(req.user, req.params.id);
  await query(supabase.from('services').delete().eq('id', req.params.id));
  res.status(204).end();
}
