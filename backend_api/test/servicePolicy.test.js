import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isInternalPayment,
  isInternalService,
} from '../src/services/servicePolicy.js';

test('esconde do catalogo os servicos tecnicos existentes na main', () => {
  for (const name of [
    'Plano ouro • ZB-ABC123 • bloqueio assinatura',
    'Plano ouro • ZB-ABC123 • recebimento imediato',
    'Corte • ajuste financeiro • valor a receber',
    'Fechamento de agenda',
  ]) {
    assert.equal(isInternalService({ name, price: 50, duration: 30 }), true);
  }
  assert.equal(
    isInternalService({ name: 'Corte degradê', price: 50, duration: 45 }),
    false,
  );
});

test('diferencia recebimento de assinatura do horario reservado', () => {
  const service = {
    name: 'Plano ouro • ZB-ABC123 • recebimento imediato',
    price: 300,
    duration: 1,
  };
  assert.equal(
    isInternalPayment({
      time: '00:00',
      client_name: 'ZB-ABC123',
      services: service,
    }),
    true,
  );
  assert.equal(
    isInternalPayment({
      time: '09:00',
      client_name: 'ZB-ABC123',
      services: service,
    }),
    false,
  );
});
