import jwt from 'jsonwebtoken';
import {
  canManageShop,
  normalizeRole,
} from '../services/accessService.js';
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

export function requireRoles(...roles) {
  const allowedRoles = new Set(roles.map(normalizeRole));
  return (req, _res, next) => {
    const currentRole = normalizeRole(req.user.role);
    const managerAccess = allowedRoles.has('gerente') && canManageShop(req.user);
    return allowedRoles.has(currentRole) || managerAccess
      ? next()
      : next(new HttpError(403, 'Voce nao possui permissao para esta operacao'));
  };
}
