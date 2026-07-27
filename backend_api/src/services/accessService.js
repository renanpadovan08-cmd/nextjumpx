import { HttpError } from '../utils/httpError.js';

export function isAdminRole(role) {
  return ['admin', 'admin_master'].includes(String(role || '').toLowerCase());
}

export function isManagerRole(role) {
  return ['gerente', 'manager', 'owner', 'admin', 'admin_master']
    .includes(String(role || '').toLowerCase());
}

export function isBarberRole(role) {
  return ['barber', 'barbeiro'].includes(String(role || '').toLowerCase());
}

export function sameShop(user, record) {
  if (user.shopId && record.shop_id) return user.shopId === record.shop_id;
  return Boolean(user.shopName && record.shop_name === user.shopName);
}

export function assertShopAccess(user, barber) {
  if (isAdminRole(user.role)) return;
  if (!sameShop(user, barber) && barber.id !== user.id) {
    throw new HttpError(403, 'Registro fora da sua barbearia');
  }
}

export function sanitizeBarber(barber) {
  const { password, password_hash, ...safe } = barber;
  return safe;
}
