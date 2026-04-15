import { dashboardRepository } from "../repositories/dashboard.repository";

export const dashboardService = {
  getDashboardOverview: async (userId: string) => {
    const { balanceAggregate, wallets } = await dashboardRepository.getWalletOverview(userId);

    // Xử lý trường hợp user chưa có ví nào (Prisma aggregate trả về null)
    const totalBalance = balanceAggregate._sum.currentBalance === null 
      ? 0n 
      : balanceAggregate._sum.currentBalance;

    return {
      totalBalance,
      wallets,
    };
  },
};