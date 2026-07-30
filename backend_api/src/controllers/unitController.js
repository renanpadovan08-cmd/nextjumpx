import { supabase, one, query } from '../services/supabaseService.js';
import { assertShopAccess, isAdminRole } from '../services/accessService.js';
import { HttpError } from '../utils/httpError.js';
function isMissingTableError(error) {
  return error?.code === '42P01'
    || error?.code === 'PGRST205'
    || /Could not find the table|relation .* does not exist/i.test(
      String(error?.message || error || ''),
    );
}

export async function list(req, res) {
  const requestedLimit = Number.parseInt(String(req.query.limit || ''), 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 200)
    : 100;
  const builder = supabase.from('unit_requests').select('*')
    .order('created_at', { ascending: false }).limit(limit);
  if (!isAdminRole(req.user.role)) builder.eq('manager_id', req.user.id);
  try {
    res.json(await query(builder));
  } catch (error) {
    if (isMissingTableError(error)) {
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
    if (isMissingTableError(error)) {
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
    const existingUnit = await supabase.from('units')
      .select('*').eq('request_id', request.id).maybeSingle();
    if (existingUnit.error && !isMissingTableError(existingUnit.error)) {
      throw new HttpError(400, existingUnit.error.message);
    }
    if (!existingUnit.data) {
      const { error: unitError } = await supabase.from('units').insert({
        request_id: request.id,
        shop_id: request.shop_id || null,
        shop_name: request.shop_name || '',
        name: request.unit_name,
        city: request.city || '',
        state: request.state || '',
        active: true,
      });
      if (isMissingTableError(unitError)) {
        throw new HttpError(
          400,
          'Atualize o banco para criar unidades operacionais antes de aprovar',
        );
      }
      if (unitError) throw new HttpError(400, unitError.message);
    }
  }
  try {
    res.json(await query(supabase.from('unit_requests').update({ status }).eq('id', req.params.id).select().single()));
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new HttpError(400, 'Funcionalidade de solicitacoes de unidade indisponivel. Atualize o banco de dados.');
    }
    throw error;
  }
}

export async function configuration(req, res) {
  let unitsBuilder = supabase.from('units').select('*')
    .eq('active', true).order('created_at');
  unitsBuilder = req.user.shopId
    ? unitsBuilder.eq('shop_id', req.user.shopId)
    : unitsBuilder.eq('shop_name', req.user.shopName);
  const { data: units, error } = await unitsBuilder;
  if (isMissingTableError(error)) {
    res.json({ enabled: false, units: [], barbers: [], requests: [] });
    return;
  }
  if (error) throw new HttpError(400, error.message);

  let barbersBuilder = supabase.from('barbers')
    .select('id,name,login,shop_id,shop_name').order('created_at');
  barbersBuilder = req.user.shopId
    ? barbersBuilder.eq('shop_id', req.user.shopId)
    : barbersBuilder.eq('shop_name', req.user.shopName);
  const barbers = await query(barbersBuilder);
  let assignments = [];
  if (barbers.length) {
    const assignmentResult = await supabase.from('barber_unit_assignments')
      .select('barber_id,unit_id')
      .in('barber_id', barbers.map((barber) => barber.id));
    if (assignmentResult.error
        && !isMissingTableError(assignmentResult.error)) {
      throw new HttpError(400, assignmentResult.error.message);
    }
    assignments = assignmentResult.data || [];
  }
  const assignmentByBarber =
    new Map(assignments.map((item) => [item.barber_id, item.unit_id]));

  let requestsBuilder = supabase.from('unit_requests').select('*')
    .order('created_at', { ascending: false }).limit(100);
  if (req.user.shopId) requestsBuilder = requestsBuilder.eq('shop_id', req.user.shopId);
  else requestsBuilder = requestsBuilder.eq('shop_name', req.user.shopName);
  const { data: requests, error: requestError } = await requestsBuilder;
  res.json({
    enabled: (units || []).length > 0,
    units: units || [],
    barbers: barbers.map((barber) => ({
      ...barber,
      unit_id: assignmentByBarber.get(barber.id) || null,
    })),
    requests: requestError ? [] : (requests || []),
  });
}

export async function assignBarber(req, res) {
  const barber = await one(
    supabase.from('barbers').select('id,name,shop_id,shop_name')
      .eq('id', req.params.barberId),
    'Barbeiro nao encontrado',
  );
  assertShopAccess(req.user, barber);
  const unitId = req.body.unitId == null || req.body.unitId === ''
    ? null
    : String(req.body.unitId);
  if (unitId) {
    const unit = await one(
      supabase.from('units').select('id,shop_id,shop_name')
        .eq('id', unitId).eq('active', true),
      'Unidade nao encontrada',
    );
    assertShopAccess(req.user, unit);
    const { error } = await supabase.from('barber_unit_assignments').upsert({
      barber_id: barber.id,
      unit_id: unit.id,
      shop_id: barber.shop_id || req.user.shopId || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'barber_id' });
    if (error) throw new HttpError(400, error.message);
  } else {
    await query(supabase.from('barber_unit_assignments')
      .delete().eq('barber_id', barber.id));
  }
  res.json({ barberId: barber.id, unitId });
}
