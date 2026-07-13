import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export interface MonthlyChartRow {
  month: Date;
  totalIncome: bigint;
  totalExpense: bigint;
}

export const dashboardRepository = {
  getWalletBalances: async (userId: string, walletId?: string) => {
    const where: Prisma.WalletWhereInput = {
      userId,
      deletedAt: null,
      archivedAt: null,
    };
    if (walletId) {
      where.id = walletId;
    }
    return Promise.all([
      prisma.wallet.aggregate({
        _sum: { currentBalance: true },
        where,
      }),
      prisma.wallet.findMany({
        where,
        select: { id: true, name: true, type: true, currentBalance: true, isDefault: true },
        orderBy: { isDefault: 'desc' },
      }),
    ]);
  },

  getMonthlyTransactionsSum: async (userId: string, startOfMonth: Date, endOfMonth: Date, walletId?: string) => {
    const where: Prisma.TransactionWhereInput = {
      userId,
      type: { in: ['INCOME', 'EXPENSE'] },
      deletedAt: null,
      transactionDate: { gte: startOfMonth, lte: endOfMonth },
    };
    if (walletId) {
      where.walletId = walletId;
    }
    return prisma.transaction.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
    });
  },

  getSpentGroupedByCategories: async (userId: string, categoryIds: string[], startDate: Date, endDate: Date, walletId?: string) => {
    const where: Prisma.TransactionWhereInput = {
      userId,
      type: 'EXPENSE',
      deletedAt: null,
      categoryId: { in: categoryIds },
      transactionDate: { gte: startDate, lte: endDate },
    };
    if (walletId) {
      where.walletId = walletId;
    }
    return prisma.transaction.groupBy({
      by: ['categoryId'],
      where,
      _sum: { amount: true },
    });
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