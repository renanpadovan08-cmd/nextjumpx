import {
  createHash,
  timingSafeEqual,
} from 'node:crypto';
import jwt from 'jsonwebtoken';

export const cashPasswordPrefix = 'zb_cash_sha256_v1$';

export function cashShopKey(value) {
  return value.shopId || value.shop_id
    || `shop:${String(value.shopName || value.shop_name || '').trim().toLowerCase()}`;
}

export function makeCashPasswordHash(value, password) {
  const digest = createHash('sha256')
    .update(`ZenBarber|cash|${cashShopKey(value)}|${String(password || '')}|v1`)
    .digest('hex');
  return `${cashPasswordPrefix}${digest}`;
}

export function cashPasswordMatches(expected, value, password) {
  const calculated = makeCashPasswordHash(value, password);
  const left = Buffer.from(String(expected || ''));
  const right = Buffer.from(calculated);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function issueCashToken(user) {
  return jwt.sign({
    type: 'cash',
    userId: user.id,
    shopKey: cashShopKey(user),
  }, process.env.JWT_SECRET, { expiresIn: '8h' });
}

export function verifyCashToken(token, user) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  return payload.type === 'cash'
    && payload.userId === user.id
    && payload.shopKey === cashShopKey(user);
}
