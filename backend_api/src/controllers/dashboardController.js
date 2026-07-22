import { supabase, query } from '../services/supabaseService.js';

export async function summary(req, res) {
  const month = String(req.query.month || new Date().toISOString().slice(0, 7));
  const start = `${month}-01`;
  const end = new Date(`${month}-01T12:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const endDate = end.toISOString().slice(0, 10);
  const barbers = await query(supabase.from('barbers').select('id,name,commission_rate').eq('shop_name', req.user.shopName));
  const ids = barbers.map((barber) => barber.id);
  const appointments = ids.length ? await query(supabase.from('appointments').select('id,barber_id,status,date,services(price)').in('barber_id', ids).gte('date', start).lt('date', endDate)) : [];
  const completed = appointments.filter((item) => ['concluido', 'finalizado'].includes(item.status));
  const revenue = completed.reduce((sum, item) => sum + Number(item.services?.price || 0), 0);
  const byBarber = barbers.map((barber) => {
    const total = completed.filter((item) => item.barber_id === barber.id).reduce((sum, item) => sum + Number(item.services?.price || 0), 0);
    return { id: barber.id, name: barber.name, revenue: total, commission: total * Number(barber.commission_rate || 0) / 100 };
  });
  res.json({ month, appointments: appointments.length, completed: completed.length, revenue, byBarber });
}
