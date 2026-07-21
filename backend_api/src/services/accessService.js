import { HttpError } from '../utils/httpError.js';

export function assertShopAccess(user, barber) {
  if (user.role === 'admin') return;
  if (barber.shop_name !== user.shopName && barber.id !== user.id) {
    throw new HttpError(403, 'Registro fora da sua barbearia');
  }
}

export function sanitizeBarber(barber) {
  const { password, password_hash, ...safe } = barber;
  return safe;
}
