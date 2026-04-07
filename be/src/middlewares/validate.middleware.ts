import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';
import { sendError } from '../utils/response';

export const validateRequest = (schema: ZodType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return sendError(res, 'Validation failed', 'VALIDATION_ERROR', 400, errors);
      }
      next(error);
    }
  };
};