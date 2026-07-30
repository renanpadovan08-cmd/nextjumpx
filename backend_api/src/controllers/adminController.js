import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { supabase, one, query } from '../services/supabaseService.js';
import { HttpError } from '../utils/httpError.js';
import { makeCashPasswordHash } from '../services/cashPasswordPolicy.js';

const barberColumns = 'id,name,login,phone,shop_name,shop_id,role,access_status,expires_at,activation_note,created_at';
const settingFields = ['monthly_fee', 'due_day', 'subscription_status', 'payment_method', 'plan_started_at', 'plan_ends_at', 'last_payment_at', 'bonus_note', 'internal_note', 'multiunit_enabled'];
const accountFields = ['name', 'login', 'phone', 'shop_name', 'role', 'access_status', 'expires_at', 'activation_note'];
const defaultPageSize = 10;
const maximumPageSize = 50;
const summaryCacheDurationMs = 30000;
let summaryCache;

function flattenAccount(barber, settingsByBarber = new Map()) {
  return { ...barber, settings: settingsByBarber.get(barber.id) || null };
}

async function settingsMap(barberIds = []) {
  let builder = supabase.from('admin_account_settings').select('*');
  if (barberIds.length) builder = builder.in('barber_id', barberIds);
  const { data, error } = await builder;
  // The old access-management view remains usable until the SQL migration is run.
  if (error?.code === '42P01') return new Map();
  if (error) throw new HttpError(400, error.message);
  return new Map((data || []).map((item) => [item.barber_id, item]));
}

async function cashSettingsMap(barbers) {
  const shopIds = [...new Set(barbers.map((item) => item.shop_id).filter(Boolean))];
  const shopNames = [...new Set(barbers
    .filter((item) => !item.shop_id)
    .map((item) => String(item.shop_name || '').trim())
    .filter(Boolean))];
  const requests = [];
  if (shopIds.length) {
    requests.push(supabase.from('cash_access_settings')
      .select('shop_id,shop_name,password_hash').in('shop_id', shopIds));
  }
  if (shopNames.length) {
    requests.push(supabase.from('cash_access_settings')
      .select('shop_id,shop_name,password_hash')
      .is('shop_id', null).in('shop_name', shopNames));
  }
  if (!requests.length) return new Map();
  const results = await Promise.all(requests);
  const rows = [];
  for (const result of results) {
    if (result.error?.code === '42P01') return new Map();
    if (result.error) throw new HttpError(400, result.error.message);
    rows.push(...(result.data || []));
  }
  return new Map(rows.map((item) => [
    item.shop_id || `shop:${String(item.shop_name || '').trim().toLowerCase()}`,
    Boolean(item.password_hash),
  ]));
}

function positiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(parsed, maximum)
    : fallback;
}

function safeSearch(value) {
  return String(value || '')
    .trim()
    .slice(0, 80)
    .replace(/[^\p{L}\p{N}\s@-]/gu, ' ')
    .replace(/\s+/g, ' ');
}

async function countAccounts(status) {
  let builder = supabase.from('barbers')
    .select('id', { count: 'exact', head: true });
  if (status) builder = builder.eq('access_status', status);
  else builder = builder.neq('access_status', 'excluido');
  const { count, error } = await builder;
  if (error) throw new HttpError(400, error.message);
  return count || 0;
}

async function accountSummary() {
  if (summaryCache?.expiresAt > Date.now()) return summaryCache.value;
  const [total, active, pending, blocked] = await Promise.all([
    countAccounts(),
    countAccounts('ativo'),
    countAccounts('pendente'),
    countAccounts('bloqueado'),
  ]);
  const value = { total, active, pending, blocked };
  summaryCache = {
    value,
    expiresAt: Date.now() + summaryCacheDurationMs,
  };
  return value;
}

function invalidateSummary() {
  summaryCache = undefined;
}

function pick(source, fields) {
  return Object.fromEntries(Object.entries(source || {}).filter(([key]) => fields.includes(key)));
}

export async function listShops(req, res) {
  const page = positiveInteger(req.query.page, 1);
  const pageSize = positiveInteger(
    req.query.pageSize,
    defaultPageSize,
    maximumPageSize,
  );
  const search = safeSearch(req.query.search);
  const offset = (page - 1) * pageSize;
  let builder = supabase.from('barbers')
    .select(barberColumns, { count: 'exact' })
    .neq('access_status', 'excluido')
    .order('created_at', { ascending: false });
  if (search) {
    builder = builder.or(
      `name.ilike.%${search}%,shop_name.ilike.%${search}%,login.ilike.%${search}%`,
    );
  }
  const [pageResult, summary] = await Promise.all([
    builder.range(offset, offset + pageSize - 1),
    accountSummary(),
  ]);
  if (pageResult.error) throw new HttpError(400, pageResult.error.message);
  const barbers = pageResult.data || [];
  const [settings, cashSettings] = await Promise.all([
    settingsMap(barbers.map((barber) => barber.id)),
    cashSettingsMap(barbers),
  ]);
  const items = barbers.map((barber) => ({
    ...flattenAccount(barber, settings),
    cashPasswordConfigured: cashSettings.get(
      barber.shop_id
        || `shop:${String(barber.shop_name || '').trim().toLowerCase()}`,
    ) === true,
  }));
  const filteredTotal = pageResult.count || 0;
  res.json({
    items,
    page,
    pageSize,
    filteredTotal,
    totalPages: Math.max(1, Math.ceil(filteredTotal / pageSize)),
    hasNext: offset + items.length < filteredTotal,
    summary,
  });
}

export async function updateAccess(req, res) {
  const patch = pick(req.body, accountFields);
  if (!Object.keys(patch).length) throw new HttpError(400, 'Nenhuma alteracao valida informada');
  for (const field of ['name', 'login', 'shop_name']) {
    if (field in patch && !String(patch[field] || '').trim()) {
      const label = field === 'shop_name'
        ? 'Barbearia'
        : field === 'name' ? 'Nome' : 'Login';
      throw new HttpError(400, `${label} e obrigatorio`);
    }
  }
  if ('name' in patch) patch.name = String(patch.name).trim();
  if ('login' in patch) patch.login = String(patch.login).trim().toLowerCase();
  if ('phone' in patch) patch.phone = String(patch.phone || '').trim();
  if ('shop_name' in patch) patch.shop_name = String(patch.shop_name).trim();
  if (patch.access_status && !['ativo', 'pendente', 'bloqueado', 'rejeitado', 'aguardando_pagamento'].includes(patch.access_status)) {
    throw new HttpError(400, 'Status de acesso invalido');
  }
  if (patch.role && !['admin', 'admin_master', 'gerente', 'manager', 'owner', 'recepcionista', 'barbeiro', 'barber'].includes(patch.role)) {
    throw new HttpError(400, 'Papel de acesso invalido');
  }
  if (patch.expires_at && !/^\d{4}-\d{2}-\d{2}$/.test(patch.expires_at)) {
    throw new HttpError(400, 'A validade deve usar o formato AAAA-MM-DD');
  }
  const updated = await query(supabase.from('barbers').update(patch).eq('id', req.params.id).select(barberColumns).single());
  invalidateSummary();
  res.json(flattenAccount(updated, await settingsMap([updated.id])));
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
  invalidateSummary();
  res.status(201).json(flattenAccount(account, await settingsMap([account.id])));
}

export async function updateSettings(req, res) {
  await one(supabase.from('barbers').select('id').eq('id', req.params.id), 'Barbearia nao encontrada');
  const settings = pick(req.body, settingFields);
  if (!Object.keys(settings).length) throw new HttpError(400, 'Nenhuma configuracao valida informada');
  await query(supabase.from('admin_account_settings').upsert({ barber_id: req.params.id, ...settings }));
  const account = await one(supabase.from('barbers').select(barberColumns).eq('id', req.params.id), 'Barbearia nao encontrada');
  res.json(flattenAccount(account, await settingsMap([account.id])));
}

export async function markPaid(req, res) {
  const { date } = req.body;
  await query(supabase.from('admin_account_settings').upsert({ barber_id: req.params.id, last_payment_at: date || new Date().toISOString().slice(0, 10), subscription_status: 'ativo' }));
  res.status(204).end();
}

export async function setCashPassword(req, res) {
  const password = String(req.body.password || '').trim();
  if (password.length < 4) {
    throw new HttpError(400, 'A senha do caixa precisa ter ao menos 4 caracteres');
  }
  const account = await one(
    supabase.from('barbers').select('id,name,shop_id,shop_name')
      .eq('id', req.params.id),
    'Barbearia nao encontrada',
  );
  const row = {
    shop_id: account.shop_id || null,
    shop_name: account.shop_name || account.name || '',
    owner_barber_id: account.id,
    password_hash: makeCashPasswordHash({
      shopId: account.shop_id,
      shopName: account.shop_name || account.name,
    }, password),
    updated_by: req.user.name || req.user.login || 'Admin',
    updated_at: new Date().toISOString(),
  };
  let builder = supabase.from('cash_access_settings').select('id').limit(1);
  builder = account.shop_id
    ? builder.eq('shop_id', account.shop_id)
    : builder.eq('shop_name', row.shop_name);
  const { data, error } = await builder;
  if (error) throw new HttpError(400, error.message);
  if (data?.[0]?.id) {
    await query(supabase.from('cash_access_settings')
      .update(row).eq('id', data[0].id));
  } else {
    await query(supabase.from('cash_access_settings').insert(row));
  }
  res.status(204).end();
}

export async function deleteAccount(req, res) {
  if (req.params.id === req.user.id) {
    throw new HttpError(400, 'O administrador nao pode excluir o proprio perfil');
  }
  const account = await one(
    supabase.from('barbers').select('id,login').eq('id', req.params.id),
    'Perfil nao encontrado',
  );
  const deletedAt = new Date().toISOString();
  await query(supabase.from('barbers').update({
    login: `excluido_${account.id}_${Date.now()}`,
    password: null,
    password_hash: null,
    access_status: 'excluido',
    activation_note:
      `Perfil excluido pelo administrador em ${deletedAt}. Login anterior: ${account.login}`,
  }).eq('id', req.params.id));
  invalidateSummary();
  res.status(204).end();
}
