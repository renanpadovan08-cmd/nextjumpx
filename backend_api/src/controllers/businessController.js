import { supabase, query } from '../services/supabaseService.js';
import { HttpError } from '../utils/httpError.js';

export async function goals(req, res) {
  const month = String(req.query.month || new Date().toISOString().slice(0, 7));
  const barbers = await query(supabase.from('barbers').select('id,name').eq('shop_name', req.user.shopName));
  const rows = barbers.length ? await query(supabase.from('barber_business_goals').select('*').in('barber_id', barbers.map((item) => item.id)).eq('month_key', month)) : [];
  res.json({ month, barbers, goals: rows });
}

export async function saveGoal(req, res) {
  const { barberId, monthKey, revenueGoal = 0, appointmentsGoal = 0 } = req.body;
  if (!barberId || !monthKey) throw new HttpError(400, 'barberId e monthKey sao obrigatorios');
  const data = await query(supabase.from('barber_business_goals').upsert({ barber_id: barberId, month_key: monthKey, revenue_goal: Number(revenueGoal), appointments_goal: Number(appointmentsGoal) }, { onConflict: 'barber_id,month_key' }).select().single());
  res.json(data);
}
