import assert from 'node:assert/strict';
import test from 'node:test';

import express from 'express';
import jwt from 'jsonwebtoken';

process.env.SUPABASE_URL ||= 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';
process.env.JWT_SECRET ||= 'test-jwt-secret';

const { default: routes } = await import('../src/routes/index.js');

async function request(path, role) {
  const app = express();
  app.use('/api', routes);
  app.use((_req, res) => res.status(404).json({ message: 'Endpoint nao encontrado' }));
  app.use((error, _req, res, _next) =>
    res.status(error.status || 500).json({ message: error.message }));

  const server = app.listen(0);
  try {
    const address = server.address();
    const token = jwt.sign({
      id: 'manager-1',
      role,
      shopId: 'manager-1',
      shopName: 'Barbearia Teste',
    }, process.env.JWT_SECRET);
    return await fetch(`http://127.0.0.1:${address.port}${path}`, {
      headers: { authorization: `Bearer ${token}` },
    });
  } finally {
    server.close();
  }
}

test('middleware admin nao intercepta endpoints montados depois dele', async () => {
  const response = await request('/api/endpoint-inexistente', 'gerente');
  assert.equal(response.status, 404);
});

test('middleware admin continua protegendo a area administrativa', async () => {
  const response = await request('/api/admin/barbers', 'gerente');
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    message: 'Voce nao possui permissao para esta operacao',
  });
});
