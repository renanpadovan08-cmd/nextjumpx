import assert from 'node:assert/strict';
import test from 'node:test';

import { requireRoles } from '../src/middleware/authMiddleware.js';
import { legacyPasswordHash } from '../src/services/passwordPolicy.js';

test('gera exatamente o hash usado pelo site legado da main', () => {
  assert.equal(
    legacyPasswordHash(' Joao Silva ', 'Senha123'),
    'zb_sha256_v1$570e8801ebb388e716804e75811d2c9d763c0733d703d652994619f26786689e',
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
