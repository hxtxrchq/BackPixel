import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { HttpError } from '../lib/http-error.js';
import { verifyAccessToken } from '../lib/jwt.js';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        role: Role;
        email: string;
        name: string;
      };
    }
  }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    return next(new HttpError(401, 'Token no enviado'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.sub,
      role: payload.role,
      email: payload.email,
      name: payload.name,
    };
    return next();
  } catch {
    return next(new HttpError(401, 'Token invalido o expirado'));
  }
};

export const requireRole = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new HttpError(401, 'No autenticado'));
    }

    if (!roles.includes(req.auth.role)) {
      return next(new HttpError(403, 'No tienes permisos para esta accion'));
    }

    return next();
  };
};
