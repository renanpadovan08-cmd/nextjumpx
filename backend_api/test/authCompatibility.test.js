import assert from 'node:assert/strict';
import test from 'node:test';

import { requireRoles } from '../src/middleware/authMiddleware.js';
import {
  isBarberRole,
  sameShop,
} from '../src/services/accessService.js';
import {
  legacyPasswordHash,
  loginLookupValues,
  normalizeLogin,
} from '../src/services/passwordPolicy.js';

test('gera exatamente o hash usado pelo site legado da main', () => {
  assert.equal(
    legacyPasswordHash(' Joao Silva ', 'Senha123'),
    'zb_sha256_v1$570e8801ebb388e716804e75811d2c9d763c0733d703d652994619f26786689e',
  );
});

test('normaliza as variações de login aceitas pela main', () => {
  assert.equal(normalizeLogin('  Joao Silva  '), 'joao-silva');
  assert.deepEqual(
    loginLookupValues('  Joao Silva  '),
    ['Joao Silva', 'joao silva', 'joao-silva'],
  );
});

test('normaliza os papeis antigos sem liberar perfis indevidos', () => {
  const adminOnly = requireRoles('admin');
  const managerOnly = requireRoles('gerente');

  let result;
  adminOnly({ user: { role: 'admin_master' } }, null, (error) => {
    result = error;
  });
  assert.equal(result, undefined);

  managerOnly({ user: { role: 'barbeiro' } }, null, (error) => {
    result = error;
  });
  assert.equal(result?.status, 403);

  managerOnly({ user: { role: 'gerente' } }, null, (error) => {
    result = error;
  });
  assert.equal(result, undefined);
});

test('trata barber e barbeiro igualmente e prioriza shop_id', () => {
  assert.equal(isBarberRole('barber'), true);
  assert.equal(isBarberRole('barbeiro'), true);
  assert.equal(sameShop(
    { shopId: 'shop-a', shopName: 'Nome repetido' },
    { shop_id: 'shop-b', shop_name: 'Nome repetido' },
  ), false);
  assert.equal(sameShop(
    { shopId: 'shop-a', shopName: 'Antiga' },
    { shop_id: 'shop-a', shop_name: 'Nova' },
  ), true);
});
