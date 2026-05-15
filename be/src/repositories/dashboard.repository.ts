import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export interface MonthlyChartRow {
  month: Date;
  totalIncome: bigint;
  totalExpense: bigint;
}

export const dashboardRepository = {
  getWalletBalances: async (userId: string) => {
    return Promise.all([
      prisma.wallet.aggregate({
        _sum: { currentBalance: true },
        where: { userId, deletedAt: null, archivedAt: null },
      }),
      prisma.wallet.findMany({
        where: { userId, deletedAt: null, archivedAt: null },
        select: { id: true, name: true, type: true, currentBalance: true, isDefault: true },
        orderBy: { isDefault: 'desc' },
      }),
    ]);
  },

  getMonthlyTransactionsSum: async (userId: string, startOfMonth: Date, endOfMonth: Date) => {
    return Promise.all([
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          type: 'INCOME',
          deletedAt: null,
          transactionDate: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          type: 'EXPENSE',
          deletedAt: null,
          transactionDate: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
    ]);
  },

  getMonthlyChartsRaw: async (userId: string, startOfYear: Date, endOfYear: Date) => {
    return prisma.$queryRaw<MonthlyChartRow[]>(Prisma.sql`
      SELECT
        DATE_TRUNC('month', t."transaction_date") AS month,
        COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'INCOME'),  0)::BIGINT AS "totalIncome",
        COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'EXPENSE'), 0)::BIGINT AS "totalExpense"
      FROM transactions t
      WHERE t."user_id"          = ${userId}
        AND t."deleted_at"       IS NULL
        AND t."transaction_date" >= ${startOfYear}
        AND t."transaction_date" <= ${endOfYear}
      GROUP BY DATE_TRUNC('month', t."transaction_date")
      ORDER BY month ASC
    `);
  },

  getExpenseGroupedByCategory: async (userId: string, startDate: Date, endDate: Date) => {
    return prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'EXPENSE',
        deletedAt: null,
        transactionDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });
  },

  getCategoriesByIds: async (categoryIds: string[]) => {
    return prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, icon: true },
    });
  }
};