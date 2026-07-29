import { supabase, query } from './supabaseService.js';
import { HttpError } from '../utils/httpError.js';

function isMissingTableError(error) {
  return error?.code === '42P01'
    || error?.code === 'PGRST205'
    || /Could not find the table|relation .* does not exist/i.test(
      String(error?.message || ''),
    );
}

export function selectedUnitId(req) {
  const value = String(req.headers['x-unit-id'] || '').trim();
  return value && value !== 'all' ? value : '';
}

export async function filterBarbersBySelectedUnit(req, barbers) {
  const unitId = selectedUnitId(req);
  if (!unitId || !barbers.length) return barbers;
  let unitBuilder = supabase.from('units').select('id,shop_id,shop_name')
    .eq('id', unitId).eq('active', true);
  if (req.user.shopId) {
    unitBuilder = unitBuilder.eq('shop_id', req.user.shopId);
  } else if (req.user.shopName) {
    unitBuilder = unitBuilder.eq('shop_name', req.user.shopName);
  }
  const { data: unit, error } = await unitBuilder.maybeSingle();
  if (isMissingTableError(error)) return barbers;
  if (error) throw new HttpError(400, error.message);
  if (!unit) throw new HttpError(403, 'Unidade fora da sua barbearia');
  const assignmentResult = await supabase.from('barber_unit_assignments')
    .select('barber_id')
    .eq('unit_id', unitId)
    .in('barber_id', barbers.map((barber) => barber.id));
  if (isMissingTableError(assignmentResult.error)) return barbers;
  if (assignmentResult.error) {
    throw new HttpError(400, assignmentResult.error.message);
  }
  const assignments = assignmentResult.data || [];
  const allowed = new Set(assignments.map((item) => item.barber_id));
  return barbers.filter((barber) => allowed.has(barber.id));
}
