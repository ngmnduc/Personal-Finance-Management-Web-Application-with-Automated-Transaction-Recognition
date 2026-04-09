import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';

export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction): Response | void => {
  // ---- 1. AppError (business logic) ----
  if (err instanceof AppError) {
    return sendError(res, err.message, err.code, err.statusCode);
  }

  // ---- 2. ZodError (validation) ----
  if (err instanceof ZodError) {
    const errors = err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendError(res, 'Validation failed', 'VALIDATION_ERROR', 400, errors);
  }

  // ---- 3. Prisma Known Errors ----
  if (err instanceof PrismaClientKnownRequestError) {
    const prismaErrorMap: Record<string, { statusCode: number; code: string; message: string }> = {
      P2002: { statusCode: 409, code: 'DUPLICATE_ERROR', message: 'Duplicate entry — record already exists' },
      P2025: { statusCode: 404, code: 'NOT_FOUND', message: 'Record not found' },
      P2003: { statusCode: 400, code: 'FK_ERROR', message: 'Referenced record not found' },
      P2028: { statusCode: 503, code: 'DB_TIMEOUT', message: 'Transaction timeout — please retry' },
    };

    const mapped = prismaErrorMap[err.code];
    if (mapped) {
      return sendError(res, mapped.message, mapped.code, mapped.statusCode);
    }

    // Unknown Prisma error
    if (env.NODE_ENV === 'development') {
      console.error(`[Prisma ${err.code}]`, err.message, { meta: err.meta });
    }
    return sendError(res, 'Database error', 'DB_ERROR', 500);
  }

  // ---- 4. Prisma Validation Error ----
  if (err instanceof PrismaClientValidationError) {
    if (env.NODE_ENV === 'development') {
      console.error('[Prisma Validation]', err.message);
    }
    return sendError(res, 'Invalid data format', 'VALIDATION_ERROR', 400);
  }

  // ---- 5. Unexpected error ----
  console.error('[Unhandled Error]', {
    method: req.method,
    url: req.originalUrl,
    userId: (req as any).user?.userId ?? 'anonymous',
    error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
  });

  const message = env.NODE_ENV === 'development'
    ? (err instanceof Error ? err.message : 'Internal Server Error')
    : 'Internal Server Error';

  return sendError(res, message, 'INTERNAL_ERROR', 500);
};