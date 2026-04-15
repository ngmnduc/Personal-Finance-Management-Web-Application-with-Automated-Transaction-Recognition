import {prisma} from "../config/prisma";

export const dashboardRepository = {
  getWalletOverview: async (userId: string) => {
    const whereCondition = {
      userId,
      deletedAt: null,
      archivedAt: null,
    };

    // Chạy song song aggregate và findMany để tối ưu hiệu suất (chỉ đi 1 vòng vào DB)
    const [balanceAggregate, wallets] = await Promise.all([
      prisma.wallet.aggregate({
        where: whereCondition,
        _sum: {
          currentBalance: true,
        },
      }),
      prisma.wallet.findMany({
        where: whereCondition,
        select: {
          id: true,
          name: true,
          type: true,
          currentBalance: true,
          isDefault: true,
        },
      }),
    ]);

    return { balanceAggregate, wallets };
  },
};