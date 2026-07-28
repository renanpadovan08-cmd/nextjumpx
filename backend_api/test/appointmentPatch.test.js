import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeAppointmentPatch,
} from '../src/services/appointmentPatch.js';

test('normaliza o envio para carteira feito pelo Flutter', () => {
  assert.deepEqual(
    normalizeAppointmentPatch({
      status: 'em_carteira',
      reminderDays: 30,
      reminderDate: '2026-08-27',
    }),
    {
      status: 'em_carteira',
      reminder_days: 30,
      reminder_date: '2026-08-27',
    },
  );
});

test('aceita o valor final e ignora campos fora do contrato', () => {
  assert.deepEqual(
    normalizeAppointmentPatch({
      status: 'concluido',
      receivedAmount: 42.5,
      paymentNote: 'Pago no PIX',
      shop_id: 'outra-barbearia',
      password_hash: 'nao-pode-passar',
    }),
    {
      status: 'concluido',
      received_amount: 42.5,
      payment_note: 'Pago no PIX',
    },
  );
});
