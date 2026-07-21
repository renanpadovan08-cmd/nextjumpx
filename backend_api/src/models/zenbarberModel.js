import { supabase } from '../config/supabase.js';
import { HttpError } from '../utils/httpError.js';

/// Persistence adapter: controllers never own Supabase error handling.
export async function execute(builder) {
  const { data, error } = await builder;
  if (error) throw new HttpError(400, error.message);
  return data;
}
export async function findOne(builder, message = 'Registro nao encontrado') {
  const data = await execute(builder.maybeSingle());
  if (!data) throw new HttpError(404, message);
  return data;
}
export { supabase };
