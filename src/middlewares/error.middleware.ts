import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http-error.js';

type ErrorLike = {
  code?: string;
  message?: string;
  name?: string;
};

const isPrismaConnectionError = (err: unknown) => {
  const maybeError = err as ErrorLike;
  return (
    maybeError?.code === 'P1001' ||
    maybeError?.code === 'P1000' ||
    maybeError?.name === 'PrismaClientInitializationError' ||
    maybeError?.message?.includes("Can't reach database server")
  );
};

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  void _next;

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Datos invalidos',
      issues: err.issues,
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      message: err.message,
    });
  }

  if (isPrismaConnectionError(err)) {
    return res.status(503).json({
      message: 'No se pudo conectar a la base de datos. Verifica la conexion de Supabase.',
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error('[UNHANDLED_ERROR]', {
      type: err instanceof Error ? err.constructor.name : typeof err,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }

  return res.status(500).json({
    message: 'Error interno del servidor',
  });
};
