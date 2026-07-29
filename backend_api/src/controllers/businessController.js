import {
  supabase,
  query,
  queryAll,
} from '../services/supabaseService.js';
import {
  canManageShop,
  isAdminRole,
  sameShop,
} from '../services/accessService.js';
import { HttpError } from '../utils/httpError.js';
import {
  businessNow,
  scheduleForDate,
  toMinutes,
} from '../services/schedulePolicy.js';
import { isInternalPayment } from '../services/servicePolicy.js';
import { filterBarbersBySelectedUnit } from '../services/unitScopeService.js';

function isMissingTableError(message) {
  return /Could not find the table|relation .* does not exist/i.test(
    String(message),
  );
}

function addDays(date, amount) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function monthEnd(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber, 0, 12))
    .toISOString()
    .slice(0, 10);
}

function clientKey(row) {
  return String(row.client_phone || '').replace(/\D/g, '')
    || String(row.client_name || '').trim().toLowerCase();
}

async function scopedBarbers(req) {
  let builder = supabase.from('barbers').select(
    'id,name,commission_rate,work_start,work_end,lunch_start,lunch_end,off_days,shop_id,shop_name',
  );
  if (!isAdminRole(req.user.role) || req.user.shopId || req.user.shopName) {
    builder = req.user.shopId
      ? builder.eq('shop_id', req.user.shopId)
      : builder.eq('shop_name', req.user.shopName);
  }
  if (!canManageShop(req.user)) builder = builder.eq('id', req.user.id);
  return filterBarbersBySelectedUnit(req, await query(builder));
}

function availableMinutes(barbers, month) {
  let total = 0;
  for (let date = `${month}-01`; date <= monthEnd(month);
    date = addDays(date, 1)) {
    for (const barber of barbers) {
      const schedule = scheduleForDate(barber, date);
      if (!schedule.open) continue;
      const start = toMinutes(schedule.start);
      const end = toMinutes(schedule.end);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        continue;
      }
      let minutes = end - start;
      const breakStart = toMinutes(schedule.break_start);
      const breakEnd = toMinutes(schedule.break_end);
      if (Number.isFinite(breakStart)
          && Number.isFinite(breakEnd)
          && breakEnd > breakStart) {
        minutes -= breakEnd - breakStart;
      }
      total += Math.max(0, minutes);
    }
  }
  return total;
}

function businessMetrics(barbers, appointments, month, goals) {
  const paidStatuses = ['concluido', 'finalizado'];
  const operational = appointments.filter((row) =>
    !isInternalPayment(row)
      && !String(row.client_name || '').startsWith('Agenda fechada'));
  const monthRows = operational.filter((row) =>
    String(row.date || '').startsWith(month));
  const done = monthRows.filter((row) => paidStatuses.includes(row.status));
  const revenue = done.reduce((total, row) =>
    total + Number(row.received_amount ?? row.services?.price ?? 0), 0);
  const commission = done.reduce((total, row) => {
    const barber = barbers.find((item) => item.id === row.barber_id);
    return total + Number(row.received_amount ?? row.services?.price ?? 0)
      * Number(barber?.commission_rate || 0) / 100;
  }, 0);
  const uniqueClients = new Set(done.map(clientKey).filter(Boolean)).size;
  const ticket = done.length ? revenue / done.length : 0;
  const present = done.length;
  const noShows = monthRows.filter((row) => row.status === 'faltou').length;
  const attendance = present + noShows
    ? (present / (present + noShows)) * 100
    : 100;
  const visits = new Map();
  for (const row of done) {
    const key = clientKey(row);
    if (key) visits.set(key, (visits.get(key) || 0) + 1);
  }
  const retention = visits.size
    ? ([...visits.values()].filter((count) => count >= 2).length
      / visits.size) * 100
    : 0;
  const capacity = availableMinutes(barbers, month);
  const usedMinutes = done.reduce((total, row) =>
    total + Number(row.services?.duration || 30), 0);
  const occupancy = capacity
    ? Math.min(100, (usedMinutes / capacity) * 100)
    : 0;
  const goalTotal = goals.reduce((total, row) =>
    total + Number(row.financial_goal || 0), 0);
  const revenueScore = goalTotal
    ? Math.min(100, (revenue / goalTotal) * 100)
    : Math.min(100, revenue / 30);
  const servicePrices = operational
    .map((row) => Number(row.services?.price || 0))
    .filter((value) => value > 0);
  const referenceTicket = servicePrices.length
    ? servicePrices.reduce((a, b) => a + b, 0) / servicePrices.length
    : ticket || 1;
  const ticketScore = Math.min(100, (ticket / referenceTicket) * 100);
  const proIndex = Math.round(
    revenueScore * 0.30
      + retention * 0.25
      + occupancy * 0.20
      + attendance * 0.15
      + ticketScore * 0.10,
  );
  const averageDuration = done.length ? usedMinutes / done.length : 45;
  const weeklyFreeMinutes = Math.max(
    0,
    (capacity - usedMinutes) / 4.35,
  );
  return {
    revenue,
    commission,
    appointments: done.length,
    uniqueClients,
    averageTicket: ticket,
    attendance: Math.round(attendance),
    retention: Math.round(retention),
    occupancy: Math.round(occupancy),
    freeHours: Number(((capacity - usedMinutes) / 60).toFixed(1)),
    missedOpportunity: Math.max(
      0,
      Math.floor(weeklyFreeMinutes / Math.max(15, averageDuration) * ticket),
    ),
    proIndex,
  };
}

export async function goals(req, res) {
  const month = String(req.query.month || new Date().toISOString().slice(0, 7));
  if (!/^\d{4}-\d{2}$/.test(month)) throw new HttpError(400, 'Mes invalido; use AAAA-MM');
  const barbers = await scopedBarbers(req);
  try {
    const rows = barbers.length ? await query(supabase.from('barber_business_goals').select('*').in('barber_id', barbers.map((item) => item.id)).eq('month_key', month)) : [];
    const appointments = barbers.length
      ? await queryAll(
        supabase.from('appointments')
          .select('*,services(name,price,duration)')
          .in('barber_id', barbers.map((item) => item.id)),
      )
      : [];
    res.json({
      month,
      barbers,
      goals: rows,
      performance: businessMetrics(barbers, appointments, month, rows),
    });
  } catch (error) {
    if (isMissingTableError(error.message)) {
      res.json({
        month,
        barbers,
        goals: [],
        performance: businessMetrics(barbers, [], month, []),
      });
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
  if (!(await filterBarbersBySelectedUnit(req, [barber])).length) {
    throw new HttpError(403, 'Barbeiro fora da unidade selecionada');
  }
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
