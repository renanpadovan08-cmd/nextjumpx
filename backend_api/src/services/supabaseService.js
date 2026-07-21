import { supabase } from '../config/supabase.js';
import { HttpError } from '../utils/httpError.js';

export async function query(builder) {
  const { data, error } = await builder;
  if (error) throw new HttpError(400, error.message);
  return data;
}

export async function one(builder, message = 'Registro nao encontrado') {
  const data = await query(builder.maybeSingle());
  if (!data) throw new HttpError(404, message);
  return data;
}

export { supabase };
