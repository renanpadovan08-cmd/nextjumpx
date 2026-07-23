import { supabase, one, query } from '../services/supabaseService.js';
import { HttpError } from '../utils/httpError.js';
export async function list(req, res) { const builder = supabase.from('unit_requests').select('*').order('created_at', { ascending: false }); if (req.user.role !== 'admin') builder.eq('manager_id', req.user.id); res.json(await query(builder)); }
export async function create(req, res) { const { unitName, city, state, barberCount, notes } = req.body; if (!unitName?.trim()) throw new HttpError(400, 'Nome da unidade e obrigatorio'); res.status(201).json(await query(supabase.from('unit_requests').insert({ manager_id: req.user.id, manager_name: req.user.name || '', manager_login: req.user.login || '', shop_name: req.user.shopName, unit_name: unitName.trim(), city: city || '', state: state || '', barber_count: Number(barberCount || 1), notes: notes || '', status: 'pendente' }).select().single())); }
export async function update(req, res) {
  const { status } = req.body;
  if (!['aprovado','rejeitado','aguardando_pagamento','bloqueado'].includes(status)) throw new HttpError(400, 'Status invalido');
  const request = await one(supabase.from('unit_requests').select('*').eq('id', req.params.id), 'Solicitacao nao encontrada');
  if (status === 'aprovado' && request.manager_id) {
    const { error } = await supabase.from('admin_account_settings').upsert({ barber_id: request.manager_id, multiunit_enabled: true });
    if (error && error.code !== '42P01') throw new HttpError(400, error.message);
    const manager = await one(supabase.from('barbers').select('activation_note').eq('id', request.manager_id), 'Gerente nao encontrado');
    const note = '${manager.activation_note || ''}'.includes('MULTIUNIDADE_LIBERADA')
      ? manager.activation_note
      : [manager.activation_note || '', 'MULTIUNIDADE_LIBERADA'].filter(Boolean).join(' | ');
    await query(supabase.from('barbers').update({ activation_note: note }).eq('id', request.manager_id));
  }
  res.json(await query(supabase.from('unit_requests').update({ status }).eq('id', req.params.id).select().single()));
}
