import assert from 'node:assert/strict';
import test from 'node:test';

import { parseDecimal } from '../src/services/numberPolicy.js';

test('normaliza valores decimais brasileiros', () => {
  assert.equal(parseDecimal('19,90'), 19.90);
  assert.equal(parseDecimal('19.90'), 19.90);
  assert.equal(parseDecimal('R$ 5.000,75'), 5000.75);
  assert.equal(parseDecimal(150.25), 150.25);
  assert.equal(Number.isNaN(parseDecimal('valor')), true);
});
