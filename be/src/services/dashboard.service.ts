import { dashboardRepository } from "../repositories/dashboard.repository";
import * as goalService from './goal.service';

export const dashboardService = {
  getDashboardOverview: async (userId: string) => {
    const { balanceAggregate, wallets } = await dashboardRepository.getWalletOverview(userId);

    const totalBalance = balanceAggregate._sum.currentBalance === null 
      ? 0n 
      : balanceAggregate._sum.currentBalance;

    return {
      totalBalance,
      wallets,
    };
  },

  getGoalsSummary: async (userId: string) => {
    return goalService.getGoalsSummary(userId);
  },
};