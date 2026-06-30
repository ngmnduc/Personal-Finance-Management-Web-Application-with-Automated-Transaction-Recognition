import { prisma } from "../config/prisma";
import { hashPassword, comparePassword } from "../utils/hash";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { AppError } from "../utils/errors";
import { NotificationType } from "@prisma/client";
import { notificationService } from "./notification.service";

const excludePassword = <T extends { passwordHash?: string }>(user: T): Omit<T, 'passwordHash'> => {
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const register = async (data: { email: string; name: string; password: string }) => {
  const { email, name, password } = data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw AppError.Conflict("Email already exists");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
    },
  });

  /* Fire-and-forget welcome notification */
  notificationService.triggerNotification(
    user.id,
    NotificationType.SYSTEM_NOTICE,
    "Welcome to Finman! Your personal financial workspace has been set up successfully. Click on '+ Create Wallet' to initialize your first account and set up your starting balance.",
    { onboarding: true }
  ).catch((err) => {
    console.error('[Notification Error] Failed to trigger welcome notification for onboarding user:', user.id, err);
  });

  const [accessToken, refreshToken] = await Promise.all([
    Promise.resolve(signAccessToken(user.id, user.tokenVersion)),
    Promise.resolve(signRefreshToken(user.id, user.tokenVersion)),
  ]);

  prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  }).catch((err) => {
    console.error('[Token Persist Error] Failed to update refresh token in DB during registration:', err);
  });

  return {
    user: excludePassword(user),
    accessToken,
    refreshToken,
  };
};

export const login = async (data: { email: string; password: string }) => {
  const { email, password } = data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw AppError.Unauthorized("Invalid email or password");
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw AppError.Unauthorized("Invalid email or password");
  }

  const [accessToken, refreshToken] = await Promise.all([
    Promise.resolve(signAccessToken(user.id, user.tokenVersion)),
    Promise.resolve(signRefreshToken(user.id, user.tokenVersion)),
  ]);

  prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  }).catch((err) => {
    console.error('[Token Persist Error] Failed to update refresh token in DB during login:', err);
  });

  return {
    user: excludePassword(user),
    accessToken,
    refreshToken,
  };
};

export const logout = async (userId: string): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
};

export const refresh = async (token: string) => {
  const decoded = verifyRefreshToken(token);

  if (!decoded.ok) {
    throw AppError.Unauthorized(decoded.error || "Invalid refresh token");
  }
  const user = await prisma.user.findUnique({
    where: { id: decoded.payload.userId },
  });

  if (!user || user.refreshToken !== token) {
    throw AppError.Unauthorized("Invalid or expired refresh token");
  }

  const newAccessToken = signAccessToken(user.id, user.tokenVersion);
  return { accessToken: newAccessToken };
};

export const getMe = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deleted_at: null },
  });

  if (!user) {
    throw AppError.NotFound("User not found");
  }

  return excludePassword(user);
};

export const updateMe = async (
  userId: string,
  data: { name?: string; currentPassword?: string; newPassword?: string; avatarUrl?: string }
) => {
  const updateData: any = {};

  if (data.name) {
    updateData.name = data.name;
  }

  if (data.newPassword) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    
    const isMatch = await comparePassword(data.currentPassword!, user.passwordHash);
    if (!isMatch) {
      throw AppError.Unauthorized("Current password is incorrect");
    }

    updateData.passwordHash = await hashPassword(data.newPassword);
    updateData.tokenVersion = { increment: 1 };
  }

  if (data.avatarUrl) {
    updateData.avatarUrl = data.avatarUrl;
  }

  if (Object.keys(updateData).length === 0) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return excludePassword(user);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return excludePassword(updatedUser);
};