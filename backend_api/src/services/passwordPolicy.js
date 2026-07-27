import crypto from 'node:crypto';

export const legacyHashPrefix = 'zb_sha256_v1$';

export function legacyPasswordHash(login, password) {
  const normalizedLogin = String(login || '').trim().toLowerCase().replace(/\s+/g, '-');
  return legacyHashPrefix + crypto
    .createHash('sha256')
    .update(`ZenBarber|${normalizedLogin}|${password}|v1`)
    .digest('hex');
}
