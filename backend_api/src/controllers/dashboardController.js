import { supabase, query } from '../services/supabaseService.js';
import { businessNow } from '../services/schedulePolicy.js';

export async function summary(req, res) {
  const month = String(req.query.month || new Date().toISOString().slice(0, 7));
  if (!/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ message: 'Mes invalido; use AAAA-MM' });
    return;
  }
  const start = `${month}-01`;
  const end = new Date(`${month}-01T12:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const endDate = end.toISOString().slice(0, 10);
  let barberBuilder = supabase.from('barbers')
    .select('id,name,commission_rate')
    .eq('shop_name', req.user.shopName);
  if (['barber', 'barbeiro'].includes(req.user.role)) {
    barberBuilder = barberBuilder.eq('id', req.user.id);
  }
  const barbers = await query(barberBuilder);
  const ids = barbers.map((barber) => barber.id);
  const appointments = ids.length ? await query(supabase.from('appointments').select('id,barber_id,status,date,time,client_name,client_phone,reminder_date,services(name,price,duration),barbers(name)').in('barber_id', ids).gte('date', start).lt('date', endDate).order('date').order('time')) : [];
  const completed = appointments.filter((item) => ['concluido', 'finalizado'].includes(item.status));
  const revenue = completed.reduce((sum, item) => sum + Number(item.services?.price || 0), 0);
  const byBarber = barbers.map((barber) => {
    const rows = completed.filter((item) => item.barber_id === barber.id);
    const total = rows.reduce((sum, item) => sum + Number(item.services?.price || 0), 0);
    return {
      id: barber.id,
      name: barber.name,
      appointments: rows.length,
      revenue: total,
      commissionRate: Number(barber.commission_rate || 0),
      commission: total * Number(barber.commission_rate || 0) / 100,
    };
  });
  const totalCommission = byBarber.reduce((sum, barber) => sum + barber.commission, 0);
  const currentBusinessTime = businessNow();
  const today = currentBusinessTime.date;
  const todayRows = appointments.filter((item) => item.date === today);
  const todayCompleted = todayRows.filter((item) => ['concluido', 'finalizado'].includes(item.status));
  const currentTime = currentBusinessTime.time;
  const nextAppointment = todayRows.find((item) =>
    ['agendado', 'encaixe', 'em_andamento'].includes(item.status) && item.time >= currentTime,
  ) || null;
  const pending = appointments.filter((item) =>
    ['agendado', 'encaixe', 'em_andamento'].includes(item.status) && item.date < today,
  ).length;
  const walletRows = appointments.filter((item) => item.status === 'em_carteira');
  const lastByClient = new Map();
  for (const row of completed) {
    const key = `${String(row.client_phone || '').replace(/\D/g, '')}|${String(row.client_name || '').trim().toLowerCase()}`;
    const current = lastByClient.get(key);
    if (!current || row.date > current.date) lastByClient.set(key, row);
  }
  const riskCount = [...lastByClient.values()].filter((row) =>
    Math.floor((new Date(`${today}T12:00:00Z`) - new Date(`${row.date}T12:00:00Z`)) / 86400000) >= 30,
  ).length;
  const zenIndex = riskCount > 5 ? 3 : riskCount > 2 ? 5 : riskCount ? 7 : 10;
  res.json({
    month,
    appointments: appointments.length,
    completed: completed.length,
    revenue,
    totalCommission,
    profit: revenue - totalCommission,
    byBarber,
    today: {
      appointments: todayRows.length,
      completed: todayCompleted.length,
      revenue: todayCompleted.reduce((sum, item) => sum + Number(item.services?.price || 0), 0),
      nextAppointment,
    },
    pending,
    walletCount: walletRows.length,
    walletAmount: walletRows.reduce((sum, item) => sum + Number(item.services?.price || 0), 0),
    retention: { risk: riskCount, recovered: 0, zenIndex },
  });
}
