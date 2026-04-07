import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifyRefreshToken, JWT_ACCESS_TYPE, JWT_REFRESH_TYPE } from '../utils/jwt';
import { sendError } from '../utils/response';
import { AppError } from '../utils/errors';

// --------------- Access Token Auth ---------------

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 'Missing or invalid authorization header', 'UNAUTHORIZED', 401);
  }

  const token = authHeader.split(' ')[1];
  const result = verifyAccessToken(token);

  if (!result.ok) {
    return sendError(res, 'Invalid or expired access token', 'UNAUTHORIZED', 401);
  }

  req.user = { userId: result.payload.userId, tokenVersion: result.payload.tokenVersion };
  next();
};

// --------------- Refresh Token Auth ---------------

export const requireRefreshToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 'Missing refresh token', 'UNAUTHORIZED', 401);
  }

  const token = authHeader.split(' ')[1];
  const result = verifyRefreshToken(token);

  if (!result.ok) {
    return sendError(res, 'Invalid or expired refresh token', 'UNAUTHORIZED', 401);
  }

  req.user = { userId: result.payload.userId, tokenVersion: result.payload.tokenVersion };
  next();
};

// --------------- Optional Auth (guest + user dual mode) ---------------

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(); // guest mode
  }

  const token = authHeader.split(' ')[1];
  const result = verifyAccessToken(token);

  if (result.ok) {
    req.user = { userId: result.payload.userId, tokenVersion: result.payload.tokenVersion };
  }
  next();
};