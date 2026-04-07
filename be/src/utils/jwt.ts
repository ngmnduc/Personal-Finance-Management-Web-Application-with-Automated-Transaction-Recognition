import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';

// --------------- Constants ---------------

export const JWT_ISSUER = 'fintrack:api';
export const JWT_AUDIENCE = 'fintrack:users';
export const JWT_ACCESS_TYPE = 'access';
export const JWT_REFRESH_TYPE = 'refresh';

// --------------- Sign ---------------

export const signAccessToken = (userId: string, tokenVersion = 0): string =>
  jwt.sign(
    { userId, type: JWT_ACCESS_TYPE, tokenVersion },
    env.JWT_ACCESS_SECRET as string,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );

export const signRefreshToken = (userId: string, tokenVersion = 0): string =>
  jwt.sign(
    { userId, type: JWT_REFRESH_TYPE, tokenVersion },
    env.JWT_REFRESH_SECRET as string,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );

// --------------- Verify (error-safe) ---------------

export type TokenPayload = { userId: string; type: string; tokenVersion?: number };

export const verifyAccessToken = (token: string): { ok: true; payload: TokenPayload } | { ok: false; error: string } => {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET as string, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JwtPayload & TokenPayload;

    if (payload.type !== JWT_ACCESS_TYPE) return { ok: false, error: 'Invalid token type' };

    return { ok: true, payload };
  } catch (e: any) {
    return { ok: false, error: e.message || 'Invalid token' };
  }
};

export const verifyRefreshToken = (token: string): { ok: true; payload: TokenPayload } | { ok: false; error: string } => {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JwtPayload & TokenPayload;

    if (payload.type !== JWT_REFRESH_TYPE) return { ok: false, error: 'Invalid token type' };

    return { ok: true, payload };
  } catch (e: any) {
    return { ok: false, error: e.message || 'Invalid token' };
  }
};