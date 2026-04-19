import { TransactionType, TxSource } from '@prisma/client';
import { prisma } from '../config/prisma';

// ─── DTO Types ────────────────────────────────────────────────────────────────

export interface CreateTransactionDto {
  userId: string;
  walletId: string;
  categoryId: string;
  type: TransactionType;
  amount: bigint;
  transactionDate: Date;
  merchant?: string;
  note?: string;
  source?: TxSource;
}

export interface UpdateTransactionDto {
  walletId?: string;
  categoryId?: string;
  type?: TransactionType;
  amount?: bigint;
  transactionDate?: Date;
  merchant?: string;
  note?: string;
}

export interface FindManyParams {
  userId: string;
  type?: TransactionType;
  categoryId?: string;
  walletId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  skip: number;
  take: number;
}

export interface MonthlySummaryParams {
  userId: string;
  year: number;
  walletId?: string;
}

// Raw row returned by $queryRaw for monthly summary
interface MonthlySummaryRaw {
  month: Date;
  totalIncome: bigint;
  totalExpense: bigint;
}

// ─── Repository ───────────────────────────────────────────────────────────────

/**
 * Create a transaction and atomically adjust wallet balance.
 * INCOME → increment | EXPENSE → decrement
 */
export const create = async (data: CreateTransactionDto) => {
  const balanceDelta =
    data.type === TransactionType.INCOME ? data.amount : -data.amount;

  const [transaction] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId: data.userId,
        walletId: data.walletId,
        categoryId: data.categoryId,
        type: data.type,
        amount: data.amount,
        transactionDate: data.transactionDate,
        merchant: data.merchant ?? null,
        note: data.note ?? null,
        source: data.source ?? TxSource.MANUAL,
      },
    }),
    prisma.wallet.update({
      where: { id: data.walletId },
      data: { currentBalance: { increment: balanceDelta } },
    }),
  ]);

  return transaction;
};

/**
 * Find a transaction by id scoped to userId, excluding soft-deleted.
 */
export const findById = async (id: string, userId: string) => {
  return prisma.transaction.findFirst({
    where: { id, userId, deletedAt: null },
  });
};

/**
 * Update a transaction and atomically rebalance wallets.
 * Handles the case where walletId changes (different wallet).
 */
export const update = async (id: string, userId: string, old: {
  amount: bigint;
  type: TransactionType;
  walletId: string;
}, data: UpdateTransactionDto) => {
  const newAmount = data.amount ?? old.amount;
  const newType = data.type ?? old.type;
  const newWalletId = data.walletId ?? old.walletId;

  // Revert old balance effect
  const revertDelta =
    old.type === TransactionType.INCOME ? -old.amount : old.amount;

  // Apply new balance effect
  const applyDelta =
    newType === TransactionType.INCOME ? newAmount : -newAmount;

  const walletChanged = newWalletId !== old.walletId;

  if (walletChanged) {
    // Revert on old wallet, apply on new wallet separately
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: old.walletId },
        data: { currentBalance: { increment: revertDelta } },
      }),
      prisma.wallet.update({
        where: { id: newWalletId },
        data: { currentBalance: { increment: applyDelta } },
      }),
      prisma.transaction.update({
        where: { id },
        data: {
          ...data,
          transactionDate: data.transactionDate,
        },
      }),
    ]);
  } else {
    // Same wallet — net delta
    const netDelta = revertDelta + applyDelta;

    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: old.walletId },
        data: { currentBalance: { increment: netDelta } },
      }),
      prisma.transaction.update({
        where: { id },
        data: {
          ...data,
          transactionDate: data.transactionDate,
        },
      }),
    ]);
  }

  // Return fresh record
  return prisma.transaction.findFirst({ where: { id, userId } });
};

/**
 * Soft-delete a transaction and atomically revert the wallet balance.
 */
export const softDelete = async (id: string, amount: bigint, type: TransactionType, walletId: string) => {
  // Revert the balance effect: opposite of what was applied on create
  const revertDelta =
    type === TransactionType.INCOME ? -amount : amount;

  await prisma.$transaction([
    prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
    prisma.wallet.update({
      where: { id: walletId },
      data: { currentBalance: { increment: revertDelta } },
    }),
  ]);
};

// ─── History & Summary ────────────────────────────────────────────────────────

/**
 * Paginated list of transactions with optional filters.
 * Includes category (id, name, icon) and wallet (id, name, type) relations.
 */
export const findMany = async (params: FindManyParams) => {
  const where = {
    userId: params.userId,
    deletedAt: null,
    ...(params.type && { type: params.type }),
    ...(params.categoryId && { categoryId: params.categoryId }),
    ...(params.walletId && { walletId: params.walletId }),
    ...(params.startDate || params.endDate
      ? {
          transactionDate: {
            ...(params.startDate && { gte: params.startDate }),
            ...(params.endDate && { lte: params.endDate }),
          },
        }
      : {}),
    ...(params.search && {
      OR: [
        { merchant: { contains: params.search, mode: 'insensitive' as const } },
        { note: { contains: params.search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [data, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, icon: true } },
        wallet: { select: { id: true, name: true, type: true } },
      },
      orderBy: { transactionDate: 'desc' },
      skip: params.skip,
      take: params.take,
    }),
    prisma.transaction.count({ where }),
  ]);

  return { data, total };
};

/**
 * Aggregate monthly income/expense totals for a given year.
 * Uses $queryRaw with Prisma.sql to prevent SQL injection.
 */
export const getMonthlySummary = async (params: MonthlySummaryParams) => {
  const { Prisma } = await import('@prisma/client');

  const startOfYear = new Date(`${params.year}-01-01T00:00:00.000Z`);
  const endOfYear   = new Date(`${params.year}-12-31T23:59:59.999Z`);

  const walletFilter = params.walletId
    ? Prisma.sql`AND t."wallet_id" = ${params.walletId}`
    : Prisma.sql``;

  const rows = await prisma.$queryRaw<MonthlySummaryRaw[]>(Prisma.sql`
    SELECT
      DATE_TRUNC('month', t."transaction_date") AS month,
      COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'INCOME'),  0)::BIGINT AS "totalIncome",
      COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'EXPENSE'), 0)::BIGINT AS "totalExpense"
    FROM transactions t
    WHERE
      t."user_id"    = ${params.userId}
      AND t."deleted_at" IS NULL
      AND t."transaction_date" >= ${startOfYear}
      AND t."transaction_date" <= ${endOfYear}
      ${walletFilter}
    GROUP BY DATE_TRUNC('month', t."transaction_date")
    ORDER BY month ASC
  `);

  return rows.map((row) => ({
    month: (row.month as Date).toISOString().slice(0, 7), // "YYYY-MM"
    totalIncome:  row.totalIncome,
    totalExpense: row.totalExpense,
    net: row.totalIncome - row.totalExpense,
  }));
};
