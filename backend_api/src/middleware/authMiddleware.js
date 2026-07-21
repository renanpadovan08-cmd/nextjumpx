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

export function requireRoles(...roles) {
  return (req, _res, next) => roles.includes(req.user.role)
    ? next()
    : next(new HttpError(403, 'Voce nao possui permissao para esta operacao'));
}
