import assert from 'node:assert/strict';
import test from 'node:test';

test('pagina consultas grandes sem truncar nos primeiros mil registros', async () => {
  process.env.SUPABASE_URL ||= 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';
  const { executePaged } = await import('../src/models/zenbarberModel.js');
  const source = Array.from({ length: 2350 }, (_, index) => ({ id: index }));
  const ranges = [];
  const builder = {
    async range(from, to) {
      ranges.push([from, to]);
      return { data: source.slice(from, to + 1), error: null };
    },
  };

  const rows = await executePaged(builder);

  assert.equal(rows.length, 2350);
  assert.deepEqual(ranges, [
    [0, 999],
    [1000, 1999],
    [2000, 2999],
  ]);
  assert.equal(rows.at(-1).id, 2349);
});
