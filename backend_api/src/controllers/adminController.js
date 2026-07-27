import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { supabase, one, query } from '../services/supabaseService.js';
import { HttpError } from '../utils/httpError.js';

const barberColumns = 'id,name,login,phone,shop_name,shop_id,role,access_status,expires_at,activation_note,created_at';
const settingFields = ['monthly_fee', 'due_day', 'subscription_status', 'payment_method', 'plan_started_at', 'plan_ends_at', 'last_payment_at', 'bonus_note', 'internal_note', 'multiunit_enabled'];
const accountFields = ['name', 'login', 'phone', 'shop_name', 'role', 'access_status', 'expires_at', 'activation_note'];

function flattenAccount(barber, settingsByBarber = new Map()) {
  return { ...barber, settings: settingsByBarber.get(barber.id) || null };
}

async function settingsMap() {
  const { data, error } = await supabase.from('admin_account_settings').select('*');
  // The old access-management view remains usable until the SQL migration is run.
  if (error?.code === '42P01') return new Map();
  if (error) throw new HttpError(400, error.message);
  return new Map((data || []).map((item) => [item.barber_id, item]));
}

function pick(source, fields) {
  return Object.fromEntries(Object.entries(source || {}).filter(([key]) => fields.includes(key)));
}

export async function listShops(_req, res) {
  const [barbers, settings] = await Promise.all([
    query(supabase.from('barbers').select(barberColumns).order('created_at', { ascending: false })),
    settingsMap(),
  ]);
  res.json(barbers.map((barber) => flattenAccount(barber, settings)));
}

export async function updateAccess(req, res) {
  const patch = pick(req.body, accountFields);
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
  const updated = await query(supabase.from('barbers').update(patch).eq('id', req.params.id).select(barberColumns).single());
  res.json(flattenAccount(updated, await settingsMap()));
}

export async function resetPassword(req, res) {
  const { password } = req.body;
  if (!password || password.length < 8) throw new HttpError(400, 'A senha precisa ter ao menos 8 caracteres');
  await one(supabase.from('barbers').select('id').eq('id', req.params.id), 'Barbeiro nao encontrado');
  await query(supabase.from('barbers').update({ password_hash: await bcrypt.hash(password, 12), password: null, must_change_password: true }).eq('id', req.params.id));
  res.status(204).end();
}

export async function createAccount(req, res) {
  const { name, login, password, phone = '', shop_name, role = 'gerente', access_status = 'ativo' } = req.body;
  if (![name, login, password, shop_name].every((value) => String(value || '').trim())) throw new HttpError(400, 'Nome, login, senha e barbearia sao obrigatorios');
  if (String(password).length < 8) throw new HttpError(400, 'A senha precisa ter ao menos 8 caracteres');
  if (!['admin', 'admin_master', 'gerente', 'manager', 'owner', 'barbeiro', 'barber'].includes(role)) throw new HttpError(400, 'Papel de acesso invalido');
  if (!['ativo', 'pendente', 'bloqueado', 'rejeitado', 'aguardando_pagamento'].includes(access_status)) throw new HttpError(400, 'Status de acesso invalido');
  const id = randomUUID();
  const account = await query(supabase.from('barbers').insert({
    id, shop_id: id, name: String(name).trim(), login: String(login).trim().toLowerCase(), password_hash: await bcrypt.hash(password, 12), phone: String(phone).trim(), shop_name: String(shop_name).trim(), role, access_status,
  }).select(barberColumns).single());
  const settings = pick(req.body, settingFields);
  if (Object.keys(settings).length) await query(supabase.from('admin_account_settings').upsert({ barber_id: account.id, ...settings }));
  res.status(201).json(flattenAccount(account, await settingsMap()));
}

export async function updateSettings(req, res) {
  await one(supabase.from('barbers').select('id').eq('id', req.params.id), 'Barbearia nao encontrada');
  const settings = pick(req.body, settingFields);
  if (!Object.keys(settings).length) throw new HttpError(400, 'Nenhuma configuracao valida informada');
  await query(supabase.from('admin_account_settings').upsert({ barber_id: req.params.id, ...settings }));
  const account = await one(supabase.from('barbers').select(barberColumns).eq('id', req.params.id), 'Barbearia nao encontrada');
  res.json(flattenAccount(account, await settingsMap()));
}

export async function markPaid(req, res) {
  const { date } = req.body;
  await query(supabase.from('admin_account_settings').upsert({ barber_id: req.params.id, last_payment_at: date || new Date().toISOString().slice(0, 10), subscription_status: 'ativo' }));
  res.status(204).end();
}

export async function deleteAccount(req, res) {
  await one(supabase.from('barbers').select('id').eq('id', req.params.id), 'Barbearia nao encontrada');
  await query(supabase.from('barbers').update({
    access_status: 'bloqueado',
    activation_note: 'Conta desativada pelo administrador',
  }).eq('id', req.params.id));
  res.status(204).end();
}
