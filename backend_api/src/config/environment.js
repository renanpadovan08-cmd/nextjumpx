export function assertRequiredEnvironment() {
  const required = ['JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Variaveis obrigatorias ausentes: ${missing.join(', ')}`);
}
