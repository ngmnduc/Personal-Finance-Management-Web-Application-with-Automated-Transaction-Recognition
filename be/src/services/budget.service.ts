import { BudgetPeriod } from '@prisma/client';
import { AppError } from '../utils/errors';
import * as budgetRepo from '../repositories/budget.repository';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateBudgetInput {
  categoryId: string;
  amountLimit: number;
  period: 'WEEKLY' | 'MONTHLY';
}

export interface UpdateBudgetInput {
  amountLimit: number;
}

// ─── Serialisation helper ─────────────────────────────────────────────────────

const serialiseBudget = (budget: any, spent: number) => {
  const limit = Number(budget.amountLimit);
  const remaining = limit - spent;
  const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;
  const status: 'exceeded' | 'warning' | 'ok' =
    percent >= 100 ? 'exceeded' : percent >= 80 ? 'warning' : 'ok';

  return {
    ...budget,
    amountLimit: limit,
    spent,
    remaining,
    percent,
    status,
  };
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const getAll = async (userId: string, period?: string) => {
  const budgets = await budgetRepo.findManyByUser(userId, period);

  return Promise.all(
    budgets.map(async (budget) => {
      const spent = await budgetRepo.calculateSpent(
        userId,
        budget.categoryId,
        budget.period as 'WEEKLY' | 'MONTHLY',
      );
      return serialiseBudget(budget, spent);
    }),
  );
};

// ──────────────────────────────────────────────────────────────────────────────

export const create = async (userId: string, body: CreateBudgetInput) => {
  if (body.amountLimit <= 0) {
    throw AppError.BadRequest('amountLimit must be greater than 0.', 'INVALID_AMOUNT');
  }

  const existing = await budgetRepo.findByCategory(userId, body.categoryId, body.period);
  if (existing) {
    throw AppError.Conflict('A budget for this category and period already exists.', 'BUDGET_EXISTS');
  }

  const budget = await budgetRepo.create({
    userId,
    categoryId: body.categoryId,
    amountLimit: BigInt(body.amountLimit),
    period: body.period as BudgetPeriod,
  });

  return { ...budget, amountLimit: Number(budget.amountLimit) };
};

// ──────────────────────────────────────────────────────────────────────────────

export const update = async (id: string, userId: string, body: UpdateBudgetInput) => {
  const budget = await budgetRepo.findById(id, userId);
  if (!budget) {
    throw AppError.NotFound('Budget not found.', 'BUDGET_NOT_FOUND');
  }

  if (body.amountLimit <= 0) {
    throw AppError.BadRequest('amountLimit must be greater than 0.', 'INVALID_AMOUNT');
  }

  const updated = await budgetRepo.update(id, {
    amountLimit: BigInt(body.amountLimit),
  });

  return { ...updated, amountLimit: Number(updated.amountLimit) };
};

// ──────────────────────────────────────────────────────────────────────────────

export const softDelete = async (id: string, userId: string) => {
  const budget = await budgetRepo.findById(id, userId);
  if (!budget) {
    throw AppError.NotFound('Budget not found.', 'BUDGET_NOT_FOUND');
  }

  await budgetRepo.softDelete(id);
};

// ─── Budget Alert ─────────────────────────────────────────────────────────────

export interface BudgetAlertResult {
  triggered: boolean;
  percent: number;
  limit: number;
  type: 'exceeded' | 'warning';
}

/**
 * Check if a budget alert should fire after a new EXPENSE transaction.
 *
 * Rules:
 *   >= 100% — always return alert (no dedup — user should always know).
 *    80–99%  — return alert once per period (deduped via alert80SentAt).
 *    < 80%   — return null.
 */
export const checkBudgetAlert = async (
  userId: string,
  categoryId: string,
  period: 'WEEKLY' | 'MONTHLY',
): Promise<BudgetAlertResult | null> => {
  const budget = await budgetRepo.findByCategory(userId, categoryId, period);
  if (!budget) return null;

  const spent   = await budgetRepo.calculateSpent(userId, categoryId, period);
  const limit   = Number(budget.amountLimit);
  const percent = limit > 0 ? (spent / limit) * 100 : 0;

  // ── 100%+ exceeded — always alert ────────────────────────────────────────
  if (percent >= 100) {
    return {
      triggered: true,
      percent: Math.round(percent),
      limit,
      type: 'exceeded',
    };
  }

  // ── 80–99% warning — dedup per cycle ─────────────────────────────────────
  if (percent >= 80) {
    const { startDate } = budgetRepo.getCurrentPeriodRange(period);
    const alreadySent =
      budget.alert80SentAt !== null && budget.alert80SentAt >= startDate;

    if (!alreadySent) {
      await budgetRepo.updateAlert80SentAt(budget.id, new Date());
      return {
        triggered: true,
        percent: Math.round(percent),
        limit,
        type: 'warning',
      };
    }
  }

  return null;
};
