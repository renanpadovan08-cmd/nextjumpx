import { supabase, query } from '../services/supabaseService.js';
import { HttpError } from '../utils/httpError.js';

function isMissingTableError(message) {
  return /Could not find the table/i.test(String(message));
}

export async function goals(req, res) {
  const month = String(req.query.month || new Date().toISOString().slice(0, 7));
  const barbers = await query(supabase.from('barbers').select('id,name').eq('shop_name', req.user.shopName));
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
  const barber = await query(supabase.from('barbers').select('id,shop_name').eq('id', barberId).single());
  if (req.user.role !== 'admin' && barber.shop_name !== req.user.shopName) throw new HttpError(403, 'Barbeiro fora da sua barbearia');
  try {
    const data = await query(supabase.from('barber_business_goals').upsert({
      barber_id: barberId,
      month_key: monthKey,
      financial_goal: Number(financialGoal ?? revenueGoal ?? 0),
      attendance_goal: Number(attendanceGoal ?? appointmentsGoal ?? 0),
    }, { onConflict: 'barber_id,month_key' }).select().single());
    res.json(data);
  } catch (error) {
    if (isMissingTableError(error.message)) {
      throw new HttpError(400, 'Funcionalidade de metas indisponivel. Atualize o banco de dados.');
    }
    throw error;
  }
}
