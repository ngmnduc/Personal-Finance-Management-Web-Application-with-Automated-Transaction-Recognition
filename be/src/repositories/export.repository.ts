import { prisma } from '../config/prisma';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExportFilters {
  from?: Date;
  to?: Date;
  walletId?: string;
  categoryId?: string;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const getTransactionsForExport = (userId: string, filters: ExportFilters = {}) => {
  const { from, to, walletId, categoryId } = filters;

  return prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(from || to
        ? {
            transactionDate: {
              ...(from ? { gte: from } : {}),
              ...(to   ? { lte: to  } : {}),
            },
          }
        : {}),
      ...(walletId   ? { walletId }   : {}),
      ...(categoryId ? { categoryId } : {}),
    },
    include: {
      category: { select: { name: true, icon: true } },
      wallet:   { select: { name: true } },
    },
    orderBy: { transactionDate: 'desc' },
  });
};
