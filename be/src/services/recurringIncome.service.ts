import { TxSource, TransactionType } from '@prisma/client';
import { AppError } from '../utils/errors';
import { prisma } from '../config/prisma';
import * as recurringRepo from '../repositories/recurringIncome.repository';
import * as transactionRepo from '../repositories/transaction.repository';

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CreateRecurringIncomeInput {
  walletId: string;
  categoryId: string;
  name: string;
  amount: number;
  dayOfMonth: number;
  isActive?: boolean;
}

export interface UpdateRecurringIncomeInput {
  walletId?: string;
  categoryId?: string;
  name?: string;
  amount?: number;
  dayOfMonth?: number;
  isActive?: boolean;
}

// ─── Serialisation helper ─────────────────────────────────────────────────────

const serialise = (record: any) => ({
  ...record,
  amount: Number(record.amount),
});

// ─── Service ──────────────────────────────────────────────────────────────────

export const getAll = async (userId: string) => {
  const records = await recurringRepo.findManyByUser(userId);
  return records.map(serialise);
};

// ──────────────────────────────────────────────────────────────────────────────

export const create = async (userId: string, input: CreateRecurringIncomeInput) => {
  // ── Validate dayOfMonth ──────────────────────────────────────────────────
  if (input.dayOfMonth < 1 || input.dayOfMonth > 28) {
    throw AppError.BadRequest(
      'dayOfMonth must be between 1 and 28.',
      'INVALID_DAY_OF_MONTH',
    );
  }

  // ── Validate amount ──────────────────────────────────────────────────────
  if (input.amount <= 0) {
    throw AppError.BadRequest('amount must be greater than 0.', 'INVALID_AMOUNT');
  }

  // ── Validate wallet ──────────────────────────────────────────────────────
  const wallet = await prisma.wallet.findFirst({
    where: { id: input.walletId, userId, deletedAt: null, archivedAt: null },
  });
  if (!wallet) {
    throw AppError.NotFound(
      'Wallet not found, archived or does not belong to you.',
      'WALLET_NOT_FOUND',
    );
  }

  // ── Validate category ────────────────────────────────────────────────────
  const category = await prisma.category.findFirst({
    where: {
      id: input.categoryId,
      deletedAt: null,
      OR: [{ userId }, { userId: null }],
    },
  });
  if (!category) {
    throw AppError.NotFound('Category not found.', 'CATEGORY_NOT_FOUND');
  }
  if (category.type !== 'INCOME') {
    throw AppError.BadRequest(
      'Recurring incomes must use an INCOME category.',
      'CATEGORY_TYPE_MISMATCH',
    );
  }

  const record = await recurringRepo.create({
    userId,
    walletId: input.walletId,
    categoryId: input.categoryId,
    name: input.name,
    amount: BigInt(input.amount),
    dayOfMonth: input.dayOfMonth,
    isActive: input.isActive ?? true,
  });

  return serialise(record);
};

// ──────────────────────────────────────────────────────────────────────────────

export const update = async (
  id: string,
  userId: string,
  input: UpdateRecurringIncomeInput,
) => {
  const existing = await recurringRepo.findById(id, userId);
  if (!existing) {
    throw AppError.NotFound('Recurring income not found.', 'RECURRING_NOT_FOUND');
  }

  if (input.amount !== undefined && input.amount <= 0) {
    throw AppError.BadRequest('amount must be greater than 0.', 'INVALID_AMOUNT');
  }

  if (input.dayOfMonth !== undefined && (input.dayOfMonth < 1 || input.dayOfMonth > 28)) {
    throw AppError.BadRequest('dayOfMonth must be between 1 and 28.', 'INVALID_DAY_OF_MONTH');
  }

  const updated = await recurringRepo.update(id, {
    ...input,
    amount: input.amount !== undefined ? BigInt(input.amount) : undefined,
  });

  return serialise(updated);
};

// ──────────────────────────────────────────────────────────────────────────────

export const deleteRecord = async (id: string, userId: string) => {
  const existing = await recurringRepo.findById(id, userId);
  if (!existing) {
    throw AppError.NotFound('Recurring income not found.', 'RECURRING_NOT_FOUND');
  }

  await recurringRepo.deleteRecord(id);
};

// ─── Internal / Cronjob ───────────────────────────────────────────────────────

/**
 * Called by the cronjob. Finds all recurring incomes due today.
 */
export const getDueToday = () => recurringRepo.findDueToday();

/**
 * Materialises a single recurring income into a real transaction.
 * Called by the cronjob after it receives the list from getDueToday.
 */
export const processInternal = async (id: string) => {
  const record = await prisma.recurringIncome.findUnique({
    where: { id },
  });
  if (!record) {
    throw AppError.NotFound('Recurring income not found.', 'RECURRING_NOT_FOUND');
  }

  const tx = await transactionRepo.create({
    userId: record.userId,
    walletId: record.walletId,
    categoryId: record.categoryId,
    type: TransactionType.INCOME,
    amount: record.amount,
    transactionDate: new Date(),
    source: TxSource.RECURRING,
    note: `Auto-generated from recurring income: ${record.name}`,
  });

  return { success: true, transactionId: tx.id };
};
