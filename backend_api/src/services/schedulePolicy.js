const DEFAULT_OPEN = '08:00';
const DEFAULT_CLOSE = '20:00';
const SCHEDULE_PREFIX = 'SCHEDULE_JSON:';
const BUSINESS_TIME_ZONE = 'America/Sao_Paulo';

export function toMinutes(value) {
  const match = String(value || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function intervalsOverlap(firstTime, firstDuration, secondTime, secondDuration) {
  const firstStart = toMinutes(firstTime);
  const secondStart = toMinutes(secondTime);
  if (![firstStart, secondStart].every(Number.isFinite)) return false;
  return firstStart < secondStart + Number(secondDuration || 30)
    && firstStart + Number(firstDuration || 30) > secondStart;
}

function dayIndex(date) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function fallbackSchedule(barber, index) {
  const raw = String(barber?.off_days || '');
  const legacyDaysOff = raw.startsWith(SCHEDULE_PREFIX) ? [] : raw.split(',').map((item) => item.trim());
  return {
    open: !legacyDaysOff.includes(String(index)),
    start: barber?.work_start || DEFAULT_OPEN,
    end: barber?.work_end || DEFAULT_CLOSE,
    break_start: barber?.break_start || barber?.lunch_start || '',
    break_end: barber?.break_end || barber?.lunch_end || '',
  };
}

export function weeklySchedule(barber) {
  const raw = String(barber?.off_days || '');
  if (raw.startsWith(SCHEDULE_PREFIX)) {
    try {
      const parsed = JSON.parse(raw.slice(SCHEDULE_PREFIX.length));
      if (Array.isArray(parsed)) {
        return Array.from({ length: 7 }, (_, index) => ({
          ...fallbackSchedule(barber, index),
          ...(parsed[index] || {}),
        }));
      }
    } catch (_) {
      // Invalid legacy schedules safely fall back to the standard fields.
    }
  }
  return Array.from({ length: 7 }, (_, index) => fallbackSchedule(barber, index));
}

export function validateWeeklyScheduleValue(value) {
  const raw = String(value || '');
  if (!raw.startsWith(SCHEDULE_PREFIX)) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw.slice(SCHEDULE_PREFIX.length));
  } catch (_) {
    return 'Configuracao semanal invalida';
  }
  if (!Array.isArray(parsed) || parsed.length !== 7) {
    return 'Informe os sete dias da semana';
  }
  for (let index = 0; index < parsed.length; index += 1) {
    const day = parsed[index] || {};
    if (day.open !== true) continue;
    const start = toMinutes(day.start);
    const end = toMinutes(day.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      return `Expediente invalido no dia ${index + 1}`;
    }
    const rawBreakStart = String(day.break_start || '').trim();
    const rawBreakEnd = String(day.break_end || '').trim();
    if (!rawBreakStart && !rawBreakEnd) continue;
    if (!rawBreakStart || !rawBreakEnd) {
      return `Informe inicio e fim da pausa no dia ${index + 1}`;
    }
    const breakStart = toMinutes(rawBreakStart);
    const breakEnd = toMinutes(rawBreakEnd);
    if (!Number.isFinite(breakStart)
        || !Number.isFinite(breakEnd)
        || breakStart >= breakEnd
        || breakStart < start
        || breakEnd > end) {
      return `Pausa invalida no dia ${index + 1}`;
    }
  }
  return null;
}

export function scheduleForDate(barber, date) {
  return weeklySchedule(barber)[dayIndex(date)] || fallbackSchedule(barber, dayIndex(date));
}

function businessNowParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function businessNow(now = new Date()) {
  const parts = businessNowParts(now);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function validateSlot({ barber, date, time, duration, allowPast = false, now }) {
  const parsedDate = new Date(`${date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))
      || Number.isNaN(parsedDate.getTime())
      || parsedDate.toISOString().slice(0, 10) !== date) {
    return 'Data invalida; use AAAA-MM-DD';
  }
  const start = toMinutes(time);
  const serviceDuration = Number(duration);
  if (!Number.isFinite(start)) return 'Horario invalido; use HH:MM';
  if (!Number.isFinite(serviceDuration) || serviceDuration < 1 || serviceDuration > 1440) return 'Duracao do servico invalida';

  const schedule = scheduleForDate(barber, date);
  if (!schedule.open) return 'Esse profissional esta de folga neste dia';

  const workStart = toMinutes(schedule.start || DEFAULT_OPEN);
  const workEnd = toMinutes(schedule.end || DEFAULT_CLOSE);
  if (!Number.isFinite(workStart) || !Number.isFinite(workEnd) || start < workStart || start + serviceDuration > workEnd) {
    return 'Horario fora do expediente do profissional';
  }

  const breakStart = toMinutes(schedule.break_start);
  const breakEnd = toMinutes(schedule.break_end);
  if (Number.isFinite(breakStart) && Number.isFinite(breakEnd)
      && start < breakEnd && start + serviceDuration > breakStart) {
    return 'Esse horario coincide com o intervalo do profissional';
  }

  if (!allowPast) {
    const parts = businessNowParts(now);
    const today = `${parts.year}-${parts.month}-${parts.day}`;
    const currentMinutes = Number(parts.hour) * 60 + Number(parts.minute);
    if (date < today || (date === today && start <= currentMinutes)) return 'Nao e possivel agendar em data ou horario passado';
  }
  return null;
}
