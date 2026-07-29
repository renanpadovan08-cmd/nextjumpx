import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cashPasswordMatches,
  makeCashPasswordHash,
} from '../src/services/cashPasswordPolicy.js';

test('gera o mesmo hash de caixa usado pela main legada', () => {
  const value = { shopId: 'shop-123', shopName: 'Zen Barber' };
  const hash = makeCashPasswordHash(value, '4321');
  assert.equal(
    hash,
    'zb_cash_sha256_v1$e1b76970363d8f5dc9f8a5c70ec267738b3b61d82c436c555a49afc00ca3f320',
  );
  assert.equal(cashPasswordMatches(hash, value, '4321'), true);
  assert.equal(cashPasswordMatches(hash, value, '1234'), false);
});
