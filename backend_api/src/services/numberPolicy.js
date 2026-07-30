export function parseDecimal(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NaN;
  }
  let text = String(value ?? '')
    .trim()
    .replace(/[^\d,.\-]/g, '');
  if (!text || text === '-') return Number.NaN;
  const comma = text.lastIndexOf(',');
  const dot = text.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    text = comma > dot
      ? text.replace(/\./g, '').replace(',', '.')
      : text.replace(/,/g, '');
  } else if (comma >= 0) {
    text = text.replace(',', '.');
  }
  return Number(text);
}
