import { supabase } from '../config/supabase.js';
import { HttpError } from '../utils/httpError.js';

/// Persistence adapter: controllers never own Supabase error handling.
export async function execute(builder) {
  const { data, error } = await builder;
  if (error) throw new HttpError(400, error.message);
  return data;
}

export async function executePaged(
  builder,
  { pageSize = 1000, maxRows = 20000 } = {},
) {
  const rows = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await builder.range(
      from,
      Math.min(from + pageSize - 1, maxRows - 1),
    );
    if (error) throw new HttpError(400, error.message);
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}
export async function findOne(builder, message = 'Registro nao encontrado') {
  const data = await execute(builder.maybeSingle());
  if (!data) throw new HttpError(404, message);
  return data;
}
export { supabase };
