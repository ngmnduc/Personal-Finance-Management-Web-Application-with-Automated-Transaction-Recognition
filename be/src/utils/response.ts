import { Response } from 'express';

export const sendSuccess = <T>(res: Response, data: T, message: string = 'Success', statusCode: number = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message
  });
};

export const sendError = (
  res: Response,
  message: string,
  code: string = 'INTERNAL_ERROR',
  statusCode: number = 500,
  errors?: unknown
) => {
  const body: { success: boolean; message: string; code: string; errors?: unknown } = {
    success: false,
    message,
    code,
  };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};