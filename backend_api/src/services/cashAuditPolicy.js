const money = (value) => Number(value || 0).toFixed(2).replace('.', ',');

export function occurrenceDate(month, dayOfMonth) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ''))) return null;
  const [year, monthNumber] = month.split('-').map(Number);
  if (monthNumber < 1 || monthNumber > 12) return null;
  const requestedDay = Math.max(1, Math.min(31, Number(dayOfMonth) || 1));
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(Math.min(requestedDay, lastDay)).padStart(2, '0')}`;
}

export function nextMonthOccurrence(fromDate, dayOfMonth) {
  const value = new Date(`${fromDate}T12:00:00Z`);
  if (Number.isNaN(value.getTime())) return null;
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + 1);
  const month = value.toISOString().slice(0, 7);
  return occurrenceDate(month, dayOfMonth);
}

export function cashAuditSummary({
  action,
  actorName,
  before = {},
  after = {},
}) {
  const actor = String(actorName || 'Usuário');
  const type = String(after.type || before.type) === 'saida' ? 'Saída' : 'Entrada';
  const description = String(after.description || before.description || 'lançamento');
  if (action === 'alteracao') {
    return `${actor} alterou ${type} • ${description}: R$ ${money(before.amount)} → R$ ${money(after.amount)}`;
  }
  if (action === 'exclusao') {
    return `${actor} excluiu ${type} • ${description}, no valor de R$ ${money(before.amount)}`;
  }
  if (action === 'recorrencia_criada') {
    return `${actor} criou a recorrência mensal de ${type} • ${description}, no valor de R$ ${money(after.amount)}`;
  }
  if (action === 'recorrencia_desativada') {
    return `${actor} desativou a recorrência mensal de ${type} • ${description}`;
  }
  return `${actor} realizou uma operação no caixa`;
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function cashAuditCsv(rows) {
  const lines = [
    ['DATA/HORA', 'PERFIL', 'PAPEL', 'AÇÃO', 'RESUMO', 'MOTIVO'],
    ...rows.map((row) => [
      row.created_at || '',
      row.actor_name || '',
      row.actor_role || '',
      row.action || '',
      row.summary || '',
      row.reason || '',
    ]),
  ];
  return lines.map((columns) => columns.map(csvCell).join(';')).join('\n');
}
