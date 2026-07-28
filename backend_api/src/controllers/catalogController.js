import { supabase, one, query } from '../services/supabaseService.js';
import {
  isAdminRole,
  isRestrictedBarber,
  sameShop,
} from '../services/accessService.js';
import { isInternalService } from '../services/servicePolicy.js';
import { HttpError } from '../utils/httpError.js';

async function ensureServiceAccess(user, serviceId) {
  const current = await one(supabase.from('services').select('*,barbers!inner(id,shop_name,shop_id)').eq('id', serviceId), 'Servico nao encontrado');
  if (!isAdminRole(user.role) && !sameShop(user, current.barbers)) throw new HttpError(403, 'Servico fora da sua barbearia');
  if (isRestrictedBarber(user) && current.barber_id !== user.id) throw new HttpError(403, 'Voce so pode alterar seus proprios servicos');
  return current;
}

export async function listServices(req, res) {
  const barberId = req.query.barberId;
  const builder = supabase.from('services').select('*').eq('active', true).order('display_order', { ascending: true }).order('created_at', { ascending: true });
  if (barberId) {
    const barber = await one(supabase.from('barbers').select('id,shop_name,shop_id').eq('id', barberId), 'Barbeiro nao encontrado');
    if (!isAdminRole(req.user.role) && !sameShop(req.user, barber)) throw new HttpError(403, 'Barbeiro fora da sua barbearia');
    if (isRestrictedBarber(req.user) && barber.id !== req.user.id) throw new HttpError(403, 'Voce so pode acessar seus proprios servicos');
    builder.eq('barber_id', barberId);
  } else if (!isAdminRole(req.user.role)) {
    let barbers;
    if (isRestrictedBarber(req.user)) {
      barbers = [{ id: req.user.id }];
    } else {
      let shopBuilder = supabase.from('barbers').select('id');
      shopBuilder = req.user.shopId
        ? shopBuilder.eq('shop_id', req.user.shopId)
        : shopBuilder.eq('shop_name', req.user.shopName);
      barbers = await query(shopBuilder);
    }
    builder.in('barber_id', barbers.map((barber) => barber.id));
  }
  res.json((await query(builder))
    .filter((service) => !isInternalService(service)));
}

export async function createService(req, res) {
  const { name, price = 0, duration = 30, barberId, iconText, imageUrl } = req.body;
  if (!name?.trim() || !barberId) throw new HttpError(400, 'Nome do servico e barbeiro sao obrigatorios');
  const barber = await one(supabase.from('barbers').select('id,shop_name,shop_id').eq('id', barberId), 'Barbeiro nao encontrado');
  if (!isAdminRole(req.user.role) && !sameShop(req.user, barber)) throw new HttpError(403, 'Barbeiro fora da sua barbearia');
  if (isRestrictedBarber(req.user) && barber.id !== req.user.id) throw new HttpError(403, 'Voce so pode criar seus proprios servicos');
  if (!Number.isFinite(Number(price)) || Number(price) < 0) throw new HttpError(400, 'Preco do servico invalido');
  if (!Number.isInteger(Number(duration)) || Number(duration) < 1 || Number(duration) > 1440) throw new HttpError(400, 'Duracao do servico invalida');
  res.status(201).json(await query(supabase.from('services').insert({ barber_id: barberId, shop_id: barber.shop_id || req.user.shopId || null, name: name.trim(), price: Number(price), duration: Number(duration), icon_text: iconText || '', image_url: imageUrl || null, active: true }).select().single()));
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
  await query(supabase.from('services').update({ active: false }).eq('id', req.params.id));
  res.status(204).end();
}
