const internalWords = [
  'assinatura',
  'bloqueio',
  'recebimento',
  'parcela',
  'cliente fixo',
  'mensalidade',
  'cobranca',
  'fechamento',
  'agenda fechada',
  'feriado',
  'ferias',
  'folga',
  'ajuste financeiro',
  'ajuste',
  'valor a receber',
  'valor recebido',
  'valor pago',
  'valor final',
  'desconto',
  'acrescimo',
  'acerto',
  'bonificado',
  'cortesia',
  'carteira',
  'contrato',
  'recorrente',
  'pacote',
];

export function normalizeServiceName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isInternalService(service) {
  const name = normalizeServiceName(service?.name);
  const hasTechnicalMarker =
    internalWords.some((marker) => name.includes(marker));
  const isLongBlock =
    Number(service?.price || 0) === 0 && Number(service?.duration || 0) >= 240;
  const hasContractCode =
    /ZB-[A-Z0-9]{4,}/i.test(String(service?.name || ''));
  return hasTechnicalMarker || isLongBlock || hasContractCode;
}

export function isInternalPayment(row) {
  if (String(row?.time || '').slice(0, 5) !== '00:00') return false;
  const text = `${row?.client_name || ''} ${row?.services?.name || ''}`;
  return /ZB-[A-Z0-9]{4,}/i.test(text) && isInternalService(row?.services);
}
