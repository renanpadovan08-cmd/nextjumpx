import assert from 'node:assert/strict';
import test from 'node:test';

import {
  businessNow,
  intervalsOverlap,
  scheduleForDate,
  validateSlot,
  weeklySchedule,
} from '../src/services/schedulePolicy.js';

const standardBarber = {
  work_start: '08:00',
  work_end: '18:00',
  off_days: '',
};

test('interpreta folgas legadas e agenda semanal JSON', () => {
  const legacy = weeklySchedule({ ...standardBarber, off_days: '0,6' });
  assert.equal(legacy[0].open, false);
  assert.equal(legacy[1].open, true);
  assert.equal(legacy[6].open, false);

  const custom = {
    ...standardBarber,
    off_days: `SCHEDULE_JSON:${JSON.stringify([
      { open: false },
      { open: true, start: '09:00', end: '17:00', break_start: '12:00', break_end: '13:00' },
    ])}`,
  };
  const monday = scheduleForDate(custom, '2026-07-27');
  assert.deepEqual(monday, {
    open: true,
    start: '09:00',
    end: '17:00',
    break_start: '12:00',
    break_end: '13:00',
  });
});

test('reutiliza os campos lunch_start e lunch_end do schema existente', () => {
  const schedule = scheduleForDate({
    ...standardBarber,
    lunch_start: '12:00',
    lunch_end: '13:00',
  }, '2026-07-27');
  assert.equal(schedule.break_start, '12:00');
  assert.equal(schedule.break_end, '13:00');
});

test('valida expediente, intervalo, passado e datas reais', () => {
  const barber = {
    ...standardBarber,
    break_start: '12:00',
    break_end: '13:00',
  };
  const now = new Date('2026-07-27T13:00:00Z'); // 10:00 em Sao Paulo

  assert.equal(validateSlot({
    barber, date: '2026-07-27', time: '10:00', duration: 30, now,
  }), 'Nao e possivel agendar em data ou horario passado');
  assert.equal(validateSlot({
    barber, date: '2026-07-27', time: '12:30', duration: 30, now,
  }), 'Esse horario coincide com o intervalo do profissional');
  assert.equal(validateSlot({
    barber, date: '2026-07-27', time: '17:45', duration: 30, now,
  }), 'Horario fora do expediente do profissional');
  assert.equal(validateSlot({
    barber, date: '2026-02-31', time: '11:00', duration: 30, now,
  }), 'Data invalida; use AAAA-MM-DD');
  assert.equal(validateSlot({
    barber, date: '2026-07-28', time: '11:00', duration: 30, now,
  }), null);
});

test('detecta sobreposicao pela duracao completa do servico', () => {
  assert.equal(intervalsOverlap('09:00', 60, '09:30', 30), true);
  assert.equal(intervalsOverlap('09:00', 30, '09:30', 30), false);
  assert.equal(intervalsOverlap('10:00', 30, '09:30', 45), true);
});

test('calcula data e hora no fuso de Sao Paulo', () => {
  assert.deepEqual(businessNow(new Date('2026-07-28T01:30:00Z')), {
    date: '2026-07-27',
    time: '22:30',
  });
});
