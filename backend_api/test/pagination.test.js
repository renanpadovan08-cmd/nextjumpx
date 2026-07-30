import assert from 'node:assert/strict';
import test from 'node:test';

import {
  pageOptions,
  pagePayload,
  wantsPagination,
} from '../src/services/pagination.js';

test('limita páginas progressivas a dez registros por padrão', () => {
  assert.deepEqual(pageOptions({ page: '3' }), { page: 3, pageSize: 10 });
  assert.deepEqual(pageOptions({ page: '-1', pageSize: '999' }), {
    page: 1,
    pageSize: 50,
  });
});

test('informa corretamente quando existe uma próxima página', () => {
  const first = pagePayload(Array(10).fill({}), 21, {
    page: 1,
    pageSize: 10,
  });
  const last = pagePayload([{}], 21, { page: 3, pageSize: 10 });
  assert.equal(first.hasNext, true);
  assert.equal(first.totalPages, 3);
  assert.equal(last.hasNext, false);
  assert.equal(wantsPagination({ paginated: 'true' }), true);
  assert.equal(wantsPagination({}), false);
});
