import {prisma} from "../config/prisma";
import { hashPassword, comparePassword } from "../utils/hash";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";

// Helper function để loại bỏ passwordHash khỏi response
const excludePassword = <T extends { passwordHash?: string }>(user: T): Omit<T, 'passwordHash'> => {
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const register = async (data: { email: string; name: string; password: string }) => {
  const { email, name, password } = data;

  // 1. Kiểm tra email đã tồn tại chưa
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const err = new Error("Email already exists");
    (err as any).code = 409;
    throw err;
  }

  const passwordHash = await hashPassword(password);

  // 2. Atomic Transaction: Tạo User + Tạo "Ví chính" mặc định
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
      },
    });

    await tx.wallet.create({
      data: {
        userId: newUser.id,
        name: "Ví chính",
        type: "GENERAL",
        initialBalance: 0,
        currentBalance: 0,
        isDefault: true,
      },
    });

    return newUser;
  });

  return excludePassword(user);
};

export const login = async (data: { email: string; password: string }) => {
  const { email, password } = data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const err = new Error("Invalid email or password");
    (err as any).code = 401;
    throw err;
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    const err = new Error("Invalid email or password");
    (err as any).code = 401;
    throw err;
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  // Giữ nguyên trả về đủ token để FE không bị chết flow /refresh
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
  const decoded = verifyRefreshToken(token); // Giả sử trả về { userId: string }

  const user = await prisma.user.findUnique({
    where: { id: (decoded as any).userId },
  });

  if (!user || user.refreshToken !== token) {
    const err = new Error("Invalid or expired refresh token");
    (err as any).code = 401;
    throw err;
  }

  const newAccessToken = signAccessToken(user.id);
  return { accessToken: newAccessToken };
};

export const getMe = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });

  if (!user) {
    const err = new Error("User not found");
    (err as any).code = 404;
    throw err;
  }

  return excludePassword(user);
};

export const updateMe = async (
  userId: string,
  data: { name?: string; currentPassword?: string; newPassword?: string }
) => {
  const updateData: any = {};

  // 1. Cập nhật tên nếu có
  if (data.name) {
    updateData.name = data.name;
  }

  // 2. Đổi mật khẩu nếu có
  if (data.newPassword) {
    // Lấy passwordHash hiện tại để so sánh (Zod đã đảm bảo currentPassword tồn tại)
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    
    const isMatch = await comparePassword(data.currentPassword!, user.passwordHash);
    if (!isMatch) {
      const err = new Error("Current password is incorrect");
      (err as any).code = 401;
      throw err;
    }

    updateData.passwordHash = await hashPassword(data.newPassword);
  }

  // 3. Update DB
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return excludePassword(updatedUser);
};