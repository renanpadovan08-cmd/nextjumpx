import { HttpError } from '../utils/httpError.js';

export function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  if (['admin', 'admin_master', 'master', 'adm'].includes(value)) return 'admin';
  if (['gerente', 'manager', 'owner', 'dono'].includes(value)) return 'gerente';
  if (['recepcionista', 'receptionist', 'recepcao'].includes(value)) {
    return 'recepcionista';
  }
  if (['barber', 'barbeiro'].includes(value)) return 'barber';
  return value;
}

export function isAdminRole(role) {
  return normalizeRole(role) === 'admin';
}

export function isManagerRole(role) {
  return ['admin', 'gerente'].includes(normalizeRole(role));
}

export function isBarberRole(role) {
  return normalizeRole(role) === 'barber';
}

export function canOperateShopAgenda(user) {
  return canManageShop(user)
    || normalizeRole(user?.role) === 'recepcionista';
}

// The legacy site also treated the first shop record as its owner. During the
// migration that ownership is represented by shop_id === user.id. Keeping this
// fallback preserves manager access for old records whose role was saved as
// "barbeiro".
export function canManageShop(user) {
  if (isManagerRole(user?.role)) return true;
  return Boolean(user?.id && user?.shopId && user.id === user.shopId);
}

export function isRestrictedBarber(user) {
  // Unknown or malformed roles must fail closed with the same scope as a
  // regular barber instead of inheriting shop-wide permissions.
  return !canManageShop(user);
}

export function sameShop(user, record) {
  if (user.shopId && record.shop_id) return user.shopId === record.shop_id;
  return Boolean(user.shopName && record.shop_name === user.shopName);
}

export function shopOwnerIdFromRecord(record) {
  return record?.shop_id || record?.id || null;
}

export function shopOwnerIdFromUser(user) {
  return user?.shopId || user?.id || null;
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
