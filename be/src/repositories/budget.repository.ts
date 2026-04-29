import { BudgetPeriod, TransactionType } from '@prisma/client';
import { prisma } from '../config/prisma';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateBudgetDto {
  userId: string;
  categoryId: string;
  amountLimit: bigint;
  period: BudgetPeriod;
}

// ─── Period helpers ───────────────────────────────────────────────────────────

/**
 * Return the inclusive [startDate, endDate] for the current cycle.
 * MONTHLY: 1st 00:00:00 → last day 23:59:59.999 of this calendar month.
 * WEEKLY:  Monday 00:00:00 → Sunday 23:59:59.999 of this ISO week.
 */
export const getCurrentPeriodRange = (
  period: 'WEEKLY' | 'MONTHLY',
): { startDate: Date; endDate: Date } => {
  const now = new Date();

  if (period === 'MONTHLY') {
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endDate   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { startDate, endDate };
  }

  // WEEKLY — ISO week: Monday–Sunday
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, …, 6=Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { startDate: monday, endDate: sunday };
};

// ─── Repository ───────────────────────────────────────────────────────────────

export const findManyByUser = (userId: string, period?: string) =>
  prisma.budget.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(period && { period: period as BudgetPeriod }),
    },
    include: {
      category: { select: { id: true, name: true, icon: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

export const findById = (id: string, userId: string) =>
  prisma.budget.findFirst({
    where: { id, userId, deletedAt: null },
    include: {
      category: { select: { id: true, name: true, icon: true, type: true } },
    },
  });

export const findByCategory = (userId: string, categoryId: string, period: string) =>
  prisma.budget.findFirst({
    where: { userId, categoryId, period: period as BudgetPeriod, deletedAt: null },
  });

export const create = (data: CreateBudgetDto) =>
  prisma.budget.create({ data });

export const update = (id: string, data: { amountLimit?: bigint }) =>
  prisma.budget.update({
    where: { id },
    data,
    include: {
      category: { select: { id: true, name: true, icon: true, type: true } },
    },
  });

export const softDelete = (id: string) =>
  prisma.budget.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

export const updateAlert80SentAt = (id: string, sentAt: Date | null) =>
  prisma.budget.update({
    where: { id },
    data: { alert80SentAt: sentAt },
  });

/**
 * Sum EXPENSE transactions within the current period window.
 * Returns a plain Number (never BigInt) — safe for arithmetic and JSON.
 */
export const calculateSpent = async (
  userId: string,
  categoryId: string,
  period: 'WEEKLY' | 'MONTHLY',
): Promise<number> => {
  const { startDate, endDate } = getCurrentPeriodRange(period);

  const result = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: {
      userId,
      categoryId,
      type: TransactionType.EXPENSE,
      deletedAt: null,
      transactionDate: { gte: startDate, lte: endDate },
    },
  });

  return Number(result._sum.amount ?? 0n);
};
