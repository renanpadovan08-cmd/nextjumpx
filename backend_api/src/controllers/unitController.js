import { supabase, one, query } from '../services/supabaseService.js';
import { HttpError } from '../utils/httpError.js';
function isMissingTableError(message) {
  return /Could not find the table/i.test(String(message));
}

export async function list(req, res) {
  const builder = supabase.from('unit_requests').select('*').order('created_at', { ascending: false });
  if (req.user.role !== 'admin') builder.eq('manager_id', req.user.id);
  try {
    res.json(await query(builder));
  } catch (error) {
    if (isMissingTableError(error.message)) {
      res.json([]);
      return;
    }
    throw error;
  }
}

export async function create(req, res) {
  const { unitName, city, state, barberCount, notes } = req.body;
  if (!unitName?.trim()) throw new HttpError(400, 'Nome da unidade e obrigatorio');
  const manager = await one(
    supabase.from('barbers').select('name,login,shop_name').eq('id', req.user.id),
    'Gerente nao encontrado',
  );
  try {
    res.status(201).json(await query(supabase.from('unit_requests').insert({ manager_id: req.user.id, shop_id: req.user.shopId || null, manager_name: manager.name || '', manager_login: manager.login || '', shop_name: manager.shop_name || req.user.shopName, unit_name: unitName.trim(), city: city || '', state: state || '', barber_count: Number(barberCount || 1), notes: notes || '', status: 'pendente' }).select().single()));
  } catch (error) {
    if (isMissingTableError(error.message)) {
      throw new HttpError(400, 'Funcionalidade de solicitacoes de unidade indisponivel. Atualize o banco de dados.');
    }
    throw error;
  }
}

export async function update(req, res) {
  const { status } = req.body;
  if (!['aprovado','rejeitado','aguardando_pagamento','bloqueado'].includes(status)) throw new HttpError(400, 'Status invalido');
  const request = await one(supabase.from('unit_requests').select('*').eq('id', req.params.id), 'Solicitacao nao encontrada');
  if (status === 'aprovado' && request.manager_id) {
    const { error } = await supabase.from('admin_account_settings').upsert({ barber_id: request.manager_id, multiunit_enabled: true });
    if (error && error.code !== '42P01') throw new HttpError(400, error.message);
    const manager = await one(supabase.from('barbers').select('activation_note').eq('id', request.manager_id), 'Gerente nao encontrado');
    const note = String(manager.activation_note || '').includes('MULTIUNIDADE_LIBERADA')
      ? manager.activation_note
      : [manager.activation_note || '', 'MULTIUNIDADE_LIBERADA'].filter(Boolean).join(' | ');
    await query(supabase.from('barbers').update({ activation_note: note }).eq('id', request.manager_id));
  }
  try {
    res.json(await query(supabase.from('unit_requests').update({ status }).eq('id', req.params.id).select().single()));
  } catch (error) {
    if (isMissingTableError(error.message)) {
      throw new HttpError(400, 'Funcionalidade de solicitacoes de unidade indisponivel. Atualize o banco de dados.');
    }
    throw error;
  }
}
