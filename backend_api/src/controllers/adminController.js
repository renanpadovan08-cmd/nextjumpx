import bcrypt from 'bcrypt';
import { supabase, one, query } from '../services/supabaseService.js';
import { HttpError } from '../utils/httpError.js';

export async function listShops(_req, res) {
  const barbers = await query(supabase.from('barbers').select('id,name,login,phone,shop_name,role,access_status,expires_at,activation_note,created_at').order('created_at', { ascending: false }));
  res.json(barbers);
}

export async function updateAccess(req, res) {
  const allowed = ['access_status', 'expires_at', 'activation_note', 'role'];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  if (!Object.keys(patch).length) throw new HttpError(400, 'Nenhuma alteracao valida informada');
  if (patch.access_status && !['ativo', 'pendente', 'bloqueado', 'rejeitado', 'aguardando_pagamento'].includes(patch.access_status)) {
    throw new HttpError(400, 'Status de acesso invalido');
  }
  if (patch.role && !['admin', 'admin_master', 'gerente', 'manager', 'owner', 'barbeiro', 'barber'].includes(patch.role)) {
    throw new HttpError(400, 'Papel de acesso invalido');
  }
  if (patch.expires_at && !/^\d{4}-\d{2}-\d{2}$/.test(patch.expires_at)) {
    throw new HttpError(400, 'A validade deve usar o formato AAAA-MM-DD');
  }
  res.json(await query(supabase.from('barbers').update(patch).eq('id', req.params.id).select('id,name,login,shop_name,role,access_status,expires_at,activation_note').single()));
}

export async function resetPassword(req, res) {
  const { password } = req.body;
  if (!password || password.length < 8) throw new HttpError(400, 'A senha precisa ter ao menos 8 caracteres');
  await one(supabase.from('barbers').select('id').eq('id', req.params.id), 'Barbeiro nao encontrado');
  await query(supabase.from('barbers').update({ password_hash: await bcrypt.hash(password, 12), password: null, must_change_password: true }).eq('id', req.params.id));
  res.status(204).end();
}
