import { TxSource, TransactionType } from '@prisma/client';
import { prisma } from '../config/prisma';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateRecurringIncomeDto {
  userId: string;
  walletId: string;
  categoryId: string;
  name: string;
  amount: bigint;
  dayOfMonth: number;
  isActive?: boolean;
}

export interface UpdateRecurringIncomeDto {
  walletId?: string;
  categoryId?: string;
  name?: string;
  amount?: bigint;
  dayOfMonth?: number;
  isActive?: boolean;
}

// ─── Shared include ───────────────────────────────────────────────────────────

const withRelations = {
  wallet:   { select: { id: true, name: true, type: true } },
  category: { select: { id: true, name: true, icon: true } },
} as const;

// ─── Repository ───────────────────────────────────────────────────────────────

export const findManyByUser = (userId: string) =>
  prisma.recurringIncome.findMany({
    where: { userId },
    include: withRelations,
    orderBy: { createdAt: 'desc' },
  });

export const findById = (id: string, userId: string) =>
  prisma.recurringIncome.findFirst({
    where: { id, userId },
  });

export const create = (data: CreateRecurringIncomeDto) =>
  prisma.recurringIncome.create({ data });

export const update = (id: string, data: UpdateRecurringIncomeDto) =>
  prisma.recurringIncome.update({ where: { id }, data });

export const deleteRecord = (id: string) =>
  prisma.recurringIncome.delete({ where: { id } });

/**
 * Find all active recurring incomes whose dayOfMonth matches today's date.
 * Used by the internal cronjob endpoint.
 */
export const findDueToday = () => {
  const today = new Date().getDate();
  return prisma.recurringIncome.findMany({
    where: { isActive: true, dayOfMonth: today },
    include: { wallet: true, category: true },
  });
};
