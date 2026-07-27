import { supabase, query } from '../services/supabaseService.js';
import { isAdminRole, sameShop } from '../services/accessService.js';
import { HttpError } from '../utils/httpError.js';

function isMissingTableError(message) {
  return /Could not find the table/i.test(String(message));
}

function canManageShop(user) {
  return ['admin', 'admin_master', 'gerente', 'manager', 'owner']
    .includes(String(user.role || '').toLowerCase());
}

export async function goals(req, res) {
  const month = String(req.query.month || new Date().toISOString().slice(0, 7));
  if (!/^\d{4}-\d{2}$/.test(month)) throw new HttpError(400, 'Mes invalido; use AAAA-MM');
  let barbersQuery = supabase.from('barbers').select('id,name');
  barbersQuery = req.user.shopId
    ? barbersQuery.eq('shop_id', req.user.shopId)
    : barbersQuery.eq('shop_name', req.user.shopName);
  if (!canManageShop(req.user)) barbersQuery.eq('id', req.user.id);
  const barbers = await query(barbersQuery);
  try {
    const rows = barbers.length ? await query(supabase.from('barber_business_goals').select('*').in('barber_id', barbers.map((item) => item.id)).eq('month_key', month)) : [];
    res.json({ month, barbers, goals: rows });
  } catch (error) {
    if (isMissingTableError(error.message)) {
      res.json({ month, barbers, goals: [] });
      return;
    }
    throw error;
  }
}

export async function saveGoal(req, res) {
  const { barberId, monthKey, revenueGoal, appointmentsGoal, financialGoal, attendanceGoal } = req.body;
  if (!barberId || !monthKey) throw new HttpError(400, 'barberId e monthKey sao obrigatorios');
  if (!/^\d{4}-\d{2}$/.test(String(monthKey))) throw new HttpError(400, 'Mes invalido; use AAAA-MM');
  if (!canManageShop(req.user) && barberId !== req.user.id) {
    throw new HttpError(403, 'Voce so pode alterar suas proprias metas');
  }
  const barber = await query(supabase.from('barbers').select('id,shop_name,shop_id').eq('id', barberId).single());
  if (!isAdminRole(req.user.role) && !sameShop(req.user, barber)) throw new HttpError(403, 'Barbeiro fora da sua barbearia');
  const financial = Number(financialGoal ?? revenueGoal ?? 0);
  const attendance = Number(attendanceGoal ?? appointmentsGoal ?? 0);
  if (!Number.isFinite(financial) || financial < 0 || !Number.isInteger(attendance) || attendance < 0) {
    throw new HttpError(400, 'Metas precisam ser valores positivos validos');
  }
  try {
    const data = await query(supabase.from('barber_business_goals').upsert({
      barber_id: barberId,
      month_key: monthKey,
      financial_goal: financial,
      attendance_goal: attendance,
    }, { onConflict: 'barber_id,month_key' }).select().single());
    res.json(data);
  } catch (error) {
    if (isMissingTableError(error.message)) {
      throw new HttpError(400, 'Funcionalidade de metas indisponivel. Atualize o banco de dados.');
    }
    throw error;
  }
}
