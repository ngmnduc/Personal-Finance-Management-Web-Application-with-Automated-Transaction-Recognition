import { WalletType } from "@prisma/client";
import {prisma} from "../config/prisma";

export const walletRepository = {
  findManyByUserId: async (userId: string) => {
    return prisma.wallet.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  },

  findByIdAndUserId: async (id: string, userId: string) => {
    return prisma.wallet.findFirst({
      where: { id, userId, deletedAt: null },
    });
  },

  countByUserId: async (userId: string) => {
    return prisma.wallet.count({
      where: { userId, deletedAt: null },
    });
  },

  create: async (data: { userId: string; name: string; type: string; initialBalance: bigint; isDefault: boolean }) => {
    return prisma.wallet.create({
      data: {
        userId: data.userId,
        name: data.name,
        type: data.type as WalletType,
        initialBalance: data.initialBalance,
        currentBalance: data.initialBalance, // Mặc định bằng initial khi mới tạo
        isDefault: data.isDefault,
      },
    });
  },

  update: async (id: string, data: { name?: string; type?: string; initialBalance?: bigint; currentBalance?: bigint }) => {
    return prisma.wallet.update({
      where: { id },
      data: {
        ...data,
        type: data.type as WalletType | undefined,
      },
    });
  },

  softDelete: async (id: string) => {
    return prisma.wallet.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  setDefaultTransaction: async (userId: string, newDefaultWalletId: string) => {
    return prisma.$transaction([
      // Bỏ default của toàn bộ ví cũ
      prisma.wallet.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      // Set default cho ví mới
      prisma.wallet.update({
        where: { id: newDefaultWalletId },
        data: { isDefault: true },
      }),
    ]);
  },
  archive: async (id: string) => {
    return prisma.wallet.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  },
};