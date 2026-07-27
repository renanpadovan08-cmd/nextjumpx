import assert from 'node:assert/strict';
import test from 'node:test';
import { configuredCorsOrigins, isCorsOriginAllowed } from '../src/services/corsPolicy.js';

test('normaliza e aceita origens configuradas explicitamente', () => {
  const environment = {
    CORS_ORIGIN: 'https://app.exemplo.com/, http://localhost:5000',
  };

  assert.deepEqual(
    [...configuredCorsOrigins(environment)],
    ['https://app.exemplo.com', 'http://localhost:5000'],
  );
  assert.equal(isCorsOriginAllowed('https://app.exemplo.com', environment), true);
});

test('aceita a URL principal informada pelo Netlify', () => {
  const environment = {
    URL: 'https://nextjumpx.netlify.app',
    SITE_NAME: 'nextjumpx',
  };

  assert.equal(isCorsOriginAllowed('https://nextjumpx.netlify.app', environment), true);
});

test('aceita deploy previews e branch deploys somente do próprio site', () => {
  const environment = { SITE_NAME: 'nextjumpx' };

  assert.equal(
    isCorsOriginAllowed('https://deploy-preview-42--nextjumpx.netlify.app', environment),
    true,
  );
  assert.equal(
    isCorsOriginAllowed('https://refactor-site--nextjumpx.netlify.app', environment),
    true,
  );
  assert.equal(
    isCorsOriginAllowed('https://nextjumpx-malicioso.netlify.app', environment),
    false,
  );
  assert.equal(
    isCorsOriginAllowed('https://deploy-preview-42--outro-site.netlify.app', environment),
    false,
  );
});

test('aceita desenvolvimento local em localhost e loopback', () => {
  assert.equal(isCorsOriginAllowed('http://localhost:64123', {}), true);
  assert.equal(isCorsOriginAllowed('http://127.0.0.1:3000', {}), true);
  assert.equal(isCorsOriginAllowed('http://[::1]:8080', {}), true);
});

test('aceita chamadas sem Origin e rejeita origens inválidas', () => {
  assert.equal(isCorsOriginAllowed(undefined, {}), true);
  assert.equal(isCorsOriginAllowed('não-é-uma-url', {}), false);
  assert.equal(isCorsOriginAllowed('ftp://nextjumpx.netlify.app', { SITE_NAME: 'nextjumpx' }), false);
});
