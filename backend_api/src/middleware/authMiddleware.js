import jwt from 'jsonwebtoken';
import { HttpError } from '../utils/httpError.js';

export function requireAuth(req, _res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new HttpError(401, 'Token de acesso ausente'));
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (_) {
    return next(new HttpError(401, 'Token de acesso invalido ou expirado'));
  }
}

const normalizeRole = (role) => {
  const value = String(role || '').trim().toLowerCase();
  if (value === 'barbeiro') return 'barber';
  if (value === 'admin_master') return 'admin';
  return value;
};

export function requireRoles(...roles) {
  const allowedRoles = new Set(roles.map(normalizeRole));
  return (req, _res, next) => allowedRoles.has(normalizeRole(req.user.role))
    ? next()
    : next(new HttpError(403, 'Voce nao possui permissao para esta operacao'));
}
