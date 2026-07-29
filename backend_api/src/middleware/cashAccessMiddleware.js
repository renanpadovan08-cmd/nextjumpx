import { verifyCashToken } from '../services/cashPasswordPolicy.js';
import { HttpError } from '../utils/httpError.js';

export function requireCashUnlock(req, _res, next) {
  const token = req.headers['x-cash-token'];
  if (!token) return next(new HttpError(423, 'Controle de Caixa bloqueado'));
  try {
    return verifyCashToken(token, req.user)
      ? next()
      : next(new HttpError(403, 'Senha do caixa nao autorizada para esta barbearia'));
  } catch (_) {
    return next(new HttpError(423, 'A liberacao do caixa expirou'));
  }
}
