import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cashAuditCsv,
  cashAuditSummary,
  nextMonthOccurrence,
  occurrenceDate,
} from '../src/services/cashAuditPolicy.js';

test('calcula recorrência mensal e ajusta o último dia do mês', () => {
  assert.equal(occurrenceDate('2026-02', 31), '2026-02-28');
  assert.equal(occurrenceDate('2028-02', 31), '2028-02-29');
  assert.equal(occurrenceDate('2026-13', 10), null);
  assert.equal(nextMonthOccurrence('2026-01-31', 31), '2026-02-28');
});

test('descreve alterações e exclusões com perfil e valores', () => {
  assert.equal(
    cashAuditSummary({
      action: 'alteracao',
      actorName: 'Nathan',
      before: { type: 'saida', description: 'Shampoo', amount: 150 },
      after: { type: 'saida', description: 'Shampoo', amount: 145.9 },
    }),
    'Nathan alterou Saída • Shampoo: R$ 150,00 → R$ 145,90',
  );
  assert.match(
    cashAuditSummary({
      action: 'exclusao',
      actorName: 'Vitor',
      before: { type: 'entrada', description: 'Ajuste', amount: 80 },
    }),
    /Vitor excluiu Entrada/,
  );
});

test('gera relatório CSV mensal da auditoria', () => {
  const csv = cashAuditCsv([{
    created_at: '2026-07-30T15:00:00Z',
    actor_name: 'Nathan',
    actor_role: 'gerente',
    action: 'alteracao',
    summary: 'Valor corrigido',
    reason: 'Digitação incorreta',
  }]);
  assert.match(csv, /DATA\/HORA/);
  assert.match(csv, /Nathan/);
  assert.match(csv, /Digitação incorreta/);
});
