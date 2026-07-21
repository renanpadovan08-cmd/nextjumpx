import { supabase, one, query } from '../services/supabaseService.js';
import { HttpError } from '../utils/httpError.js';

export async function listServices(req, res) {
  const barberId = req.query.barberId;
  const builder = supabase.from('services').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: true });
  if (barberId) builder.eq('barber_id', barberId);
  res.json(await query(builder));
}

export async function createService(req, res) {
  const { name, price = 0, duration = 30, barberId, iconText, imageUrl } = req.body;
  if (!name?.trim() || !barberId) throw new HttpError(400, 'Nome do servico e barbeiro sao obrigatorios');
  res.status(201).json(await query(supabase.from('services').insert({ barber_id: barberId, name: name.trim(), price: Number(price), duration: Number(duration), icon_text: iconText || '', image_url: imageUrl || null }).select().single()));
}

export async function updateService(req, res) {
  const current = await one(supabase.from('services').select('*,barbers!inner(shop_name)').eq('id', req.params.id), 'Servico nao encontrado');
  if (req.user.role !== 'admin' && current.barbers.shop_name !== req.user.shopName) throw new HttpError(403, 'Servico fora da sua barbearia');
  const allowed = ['name', 'price', 'duration', 'icon_text', 'image_url', 'display_order'];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  res.json(await query(supabase.from('services').update(patch).eq('id', req.params.id).select().single()));
}

export async function deleteService(req, res) {
  await query(supabase.from('services').delete().eq('id', req.params.id));
  res.status(204).end();
}
