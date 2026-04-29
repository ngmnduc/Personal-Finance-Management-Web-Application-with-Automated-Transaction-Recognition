import { TransactionType } from '@prisma/client';
import { AppError } from '../utils/errors';
import { prisma } from '../config/prisma';
import * as transactionRepo from '../repositories/transaction.repository';
import * as budgetService from './budget.service';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  FindManyParams,
  MonthlySummaryParams,
} from '../repositories/transaction.repository';
import { getPaginationParams } from '../utils/pagination';

// ─── Input DTOs from Controller ───────────────────────────────────────────────

export interface CreateTransactionInput {
  walletId: string;
  categoryId: string;
  type: string;       // arrives as string from req.body, normalised here
  amount: string;     // arrives as string/number from req.body → BigInt here
  transactionDate: string;
  merchant?: string;
  note?: string;
}

export interface UpdateTransactionInput {
  walletId?: string;
  categoryId?: string;
  type?: string;
  amount?: string;
  transactionDate?: string;
  merchant?: string;
  note?: string;
}

export interface FindManyQuery {
  type?: string;
  categoryId?: string;
  walletId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page: number;
  limit: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const create = async (userId: string, input: CreateTransactionInput) => {
  // ── Normalise & validate type ──────────────────────────────────────────
  const type = input.type?.toUpperCase() as TransactionType;
  if (type !== TransactionType.INCOME && type !== TransactionType.EXPENSE) {
    throw AppError.BadRequest('Invalid transaction type. Must be INCOME or EXPENSE.', 'INVALID_TYPE');
  }

  // ── Validate amount ────────────────────────────────────────────────────
  const amount = BigInt(input.amount);
  if (amount <= 0n) {
    throw AppError.BadRequest('Amount must be greater than 0.', 'INVALID_AMOUNT');
  }

  // ── Validate wallet ────────────────────────────────────────────────────
  const wallet = await prisma.wallet.findFirst({
    where: { id: input.walletId, userId, deletedAt: null, archivedAt: null },
  });
  if (!wallet) {
    throw AppError.NotFound('Wallet not found, archived or does not belong to you.', 'WALLET_NOT_FOUND');
  }

  // ── Validate category ──────────────────────────────────────────────────
  const category = await prisma.category.findFirst({
    where: {
      id: input.categoryId,
      deletedAt: null,
      OR: [{ userId }, { userId: null }], // own or system category
    },
  });
  if (!category) {
    throw AppError.NotFound('Category not found.', 'CATEGORY_NOT_FOUND');
  }

  // ── Type mismatch guard ────────────────────────────────────────────────
  if (category.type !== type) {
    throw AppError.BadRequest(
      `Category type "${category.type}" does not match transaction type "${type}".`,
      'TYPE_MISMATCH',
    );
  }

  const dto: CreateTransactionDto = {
    userId,
    walletId: input.walletId,
    categoryId: input.categoryId,
    type,
    amount,
    transactionDate: new Date(input.transactionDate),
    merchant: input.merchant,
    note: input.note,
  };

  const transaction = await transactionRepo.create(dto);

  // ── Budget alert check ───────────────────────────────────────────────────
  let budget_alert = null;
  if (type === TransactionType.EXPENSE) {
    budget_alert = await budgetService.checkBudgetAlert(
      userId,
      input.categoryId,
      'MONTHLY',
    );
  }

  return { transaction, budget_alert };
};

// ──────────────────────────────────────────────────────────────────────────

export const findById = async (id: string, userId: string) => {
  const transaction = await transactionRepo.findById(id, userId);
  if (!transaction) {
    throw AppError.NotFound('Transaction not found.', 'TRANSACTION_NOT_FOUND');
  }
  return transaction;
};

// ──────────────────────────────────────────────────────────────────────────

export const update = async (id: string, userId: string, input: UpdateTransactionInput) => {
  // Fetch existing (also validates ownership)
  const existing = await transactionRepo.findById(id, userId);
  if (!existing) {
    throw AppError.NotFound('Transaction not found.', 'TRANSACTION_NOT_FOUND');
  }

  // ── Normalise optional fields ──────────────────────────────────────────
  const newType = input.type
    ? (input.type.toUpperCase() as TransactionType)
    : undefined;

  if (newType && newType !== TransactionType.INCOME && newType !== TransactionType.EXPENSE) {
    throw AppError.BadRequest('Invalid transaction type.', 'INVALID_TYPE');
  }

  const newAmount = input.amount !== undefined ? BigInt(input.amount) : undefined;
  if (newAmount !== undefined && newAmount <= 0n) {
    throw AppError.BadRequest('Amount must be greater than 0.', 'INVALID_AMOUNT');
  }

  // ── Validate new wallet if changing ───────────────────────────────────
  if (input.walletId && input.walletId !== existing.walletId) {
    const wallet = await prisma.wallet.findFirst({
      where: { id: input.walletId, userId, deletedAt: null, archivedAt: null },
    });
    if (!wallet) {
      throw AppError.NotFound('New wallet not found, archived or does not belong to you.', 'WALLET_NOT_FOUND');
    }
  }

  // ── Validate new category if changing ─────────────────────────────────
  if (input.categoryId && input.categoryId !== existing.categoryId) {
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

    const resolvedType = newType ?? existing.type;
    if (category.type !== resolvedType) {
      throw AppError.BadRequest(
        `Category type "${category.type}" does not match transaction type "${resolvedType}".`,
        'TYPE_MISMATCH',
      );
    }
  }

  const dto: UpdateTransactionDto = {
    walletId: input.walletId,
    categoryId: input.categoryId,
    type: newType,
    amount: newAmount,
    transactionDate: input.transactionDate ? new Date(input.transactionDate) : undefined,
    merchant: input.merchant,
    note: input.note,
  };

  return transactionRepo.update(id, userId, {
    amount: existing.amount,
    type: existing.type,
    walletId: existing.walletId,
  }, dto);
};

// ──────────────────────────────────────────────────────────────────────────

export const softDelete = async (id: string, userId: string) => {
  const existing = await transactionRepo.findById(id, userId);
  if (!existing) {
    throw AppError.NotFound('Transaction not found.', 'TRANSACTION_NOT_FOUND');
  }

  await transactionRepo.softDelete(
    id,
    existing.amount,
    existing.type,
    existing.walletId,
  );
};

// ─── History & Summary ────────────────────────────────────────────────────────

export const findMany = async (userId: string, query: FindManyQuery) => {
  const { skip, take } = getPaginationParams(query.page, query.limit);

  const type = query.type
    ? (query.type.toUpperCase() as TransactionType)
    : undefined;

  if (type && type !== TransactionType.INCOME && type !== TransactionType.EXPENSE) {
    throw AppError.BadRequest('Invalid transaction type filter.', 'INVALID_TYPE');
  }

  const params: FindManyParams = {
    userId,
    skip,
    take,
    type,
    categoryId: query.categoryId,
    walletId: query.walletId,
    startDate: query.startDate ? new Date(query.startDate) : undefined,
    endDate: query.endDate ? new Date(query.endDate) : undefined,
    search: query.search,
  };

  return transactionRepo.findMany(params);
};

// ──────────────────────────────────────────────────────────────────────────

export const getMonthlySummary = async (userId: string, year: number, walletId?: string) => {
  const params: MonthlySummaryParams = { userId, year, walletId };
  return transactionRepo.getMonthlySummary(params);
};
