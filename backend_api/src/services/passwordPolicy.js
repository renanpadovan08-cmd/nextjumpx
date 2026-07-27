import crypto from 'node:crypto';

export const legacyHashPrefix = 'zb_sha256_v1$';

export function normalizeLogin(login) {
  return String(login || '').trim().toLowerCase().replace(/\s+/g, '-');
}

export function loginLookupValues(login) {
  const raw = String(login || '').trim();
  return [...new Set([raw, raw.toLowerCase(), normalizeLogin(raw)].filter(Boolean))];
}

export function legacyPasswordHash(login, password) {
  const normalizedLogin = normalizeLogin(login);
  return legacyHashPrefix + crypto
    .createHash('sha256')
    .update(`ZenBarber|${normalizedLogin}|${password}|v1`)
    .digest('hex');
}
