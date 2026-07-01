import { Prisma, TransactionType, TxSource, NotificationType } from '@prisma/client';
import { AppError } from '../utils/errors';
import { prisma } from '../config/prisma';
import * as recurringRuleRepo from '../repositories/recurringRule.repository';
import { notificationService } from './notification.service';

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface ConfirmRuleInput {
  ruleId: string;
}

// ─── Serialisation helper ─────────────────────────────────────────────────────

const serialise = (rule: any) => ({
  ...rule,
  amount: Number(rule.amount),
});

// ─── Detection: central recurring pattern engine ──────────────────────────────

/**
 * Called fire-and-forget after every EXPENSE transaction creation.
 * Analyses past transactions to detect a monthly recurring pattern.
 * If found and no rule exists, inserts a suggestion (isActive=false).
 */
export const detectAndCreateSuggestion = async (
  userId: string,
  merchant: string,
  amount: bigint,
  categoryId: string,
  walletId: string,
): Promise<any | null> => {
  // Skip if a rule (active or pending) already exists for this pattern
  const existing = await recurringRuleRepo.findExistingRule(userId, merchant, amount);
  if (existing) return null;

  // Query the last 10 EXPENSE transactions matching this merchant + amount
  const rows = await prisma.$queryRaw<{ transaction_date: Date }[]>(
    Prisma.sql`
      SELECT transaction_date
      FROM transactions
      WHERE user_id   = ${userId}
        AND type      = 'EXPENSE'
        AND deleted_at IS NULL
        AND LOWER(merchant) = LOWER(${merchant})
        AND amount    = ${amount}
      ORDER BY transaction_date DESC
      LIMIT 10
    `,
  );

  // Need at least 2 occurrences to establish a pattern
  if (rows.length < 2) return null;

  const dates = rows.map((r) => new Date(r.transaction_date));

  // Calculate intervals in days between consecutive dates
  const intervals: number[] = [];
  for (let i = 0; i < dates.length - 1; i++) {
    const diffMs  = dates[i].getTime() - dates[i + 1].getTime();
    const diffDay = Math.round(diffMs / (1000 * 60 * 60 * 24));
    intervals.push(diffDay);
  }

  const avgInterval = intervals.reduce((sum, v) => sum + v, 0) / intervals.length;

  // Only flag as monthly if average interval is 25–35 days
  if (avgInterval < 25 || avgInterval > 35) return null;

  // Suggest next due date as 30 days from the most recent transaction
  const nextDueDate = new Date(dates[0]);
  nextDueDate.setDate(nextDueDate.getDate() + 30);

  const rule = await recurringRuleRepo.create({
    userId,
    categoryId,
    walletId,
    merchant,
    amount,
    intervalDays: 30,
    nextDueDate,
  });

  notificationService.triggerNotification(
    userId,
    NotificationType.RECURRING_SUGGESTION,
    `New recurring pattern discovered for ${merchant}. Review the suggestion to activate.`,
    { ruleId: rule.id }
  ).catch((err) => console.error('[Notification] Failed to trigger recurring suggestion alert:', err));

  return serialise(rule);
};

// ─── User-facing CRUD ─────────────────────────────────────────────────────────

export const getSuggestions = async (userId: string) => {
  const rules = await recurringRuleRepo.findSuggestions(userId);
  return rules.map(serialise);
};

export const getActiveRules = async (userId: string) => {
  const rules = await recurringRuleRepo.findActiveRules(userId);
  return rules.map(serialise);
};

export const confirmRule = async (userId: string, ruleId: string) => {
  const rule = await recurringRuleRepo.findById(ruleId, userId);
  if (!rule) throw AppError.NotFound('Recurring rule not found.', 'RULE_NOT_FOUND');
  if (rule.isActive) throw AppError.BadRequest('Rule is already active.', 'RULE_ALREADY_ACTIVE');

  // Ensure nextDueDate is set before activation
  if (!rule.nextDueDate) {
    await recurringRuleRepo.update(ruleId, {
      nextDueDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + rule.intervalDays);
        return d;
      })(),
    });
  }

  const confirmed = await recurringRuleRepo.confirmRule(ruleId);
  return serialise(confirmed);
};

export const snoozeRule = async (userId: string, ruleId: string) => {
  const rule = await recurringRuleRepo.findById(ruleId, userId);
  if (!rule) throw AppError.NotFound('Recurring rule not found.', 'RULE_NOT_FOUND');
  const snoozed = await recurringRuleRepo.snooze(ruleId, 60);
  return serialise(snoozed);
};

export const deleteRule = async (userId: string, ruleId: string) => {
  const rule = await recurringRuleRepo.findById(ruleId, userId);
  if (!rule) throw AppError.NotFound('Recurring rule not found.', 'RULE_NOT_FOUND');
  await recurringRuleRepo.softDelete(ruleId);
};

// ─── Internal / Cronjob ───────────────────────────────────────────────────────

export const getDueRules = async () => {
  const rules = await recurringRuleRepo.findDueRules();
  return rules.map(serialise);
};

/**
 * Materialise a single recurring rule into an EXPENSE transaction.
 * Atomic: creates transaction + debits wallet in one prisma.$transaction.
 */
export const processRule = async (ruleId: string) => {
  // Re-fetch without userId scope for internal use
  const fullRule = await prisma.recurringRule.findFirst({
    where: { id: ruleId, isActive: true, deletedAt: null },
  });
  if (!fullRule) throw AppError.NotFound('Recurring rule not found or inactive.', 'RULE_NOT_FOUND');

  //check tình trạng ví trước khi thực hiện giao dịch
  const wallet = await prisma.wallet.findFirst({
    where: { id: fullRule.walletId, deletedAt: null, archivedAt: null }
  });

  if (!wallet) {
    await prisma.recurringRule.update({ where: { id: ruleId }, data: { isActive: false } });
    notificationService.triggerNotification(
      fullRule.userId,
      NotificationType.SYSTEM_NOTICE,
      `Recurring rule for "${fullRule.merchant}" has been automatically paused because its linked wallet is no longer available.`,
      { ruleId, merchant: fullRule.merchant, reason: 'WALLET_INACTIVE' },
    ).catch((err) => console.error('[Notification] Failed to notify wallet inactive for recurring rule:', err));
    throw AppError.BadRequest('Target wallet is inactive or archived. Rule deactivated.', 'WALLET_INACTIVE');
  }

  const category = await prisma.category.findFirst({
    where: { id: fullRule.categoryId, deletedAt: null },
  });

  if (!category) {
    await prisma.recurringRule.update({ where: { id: ruleId }, data: { isActive: false } });
    notificationService.triggerNotification(
      fullRule.userId,
      NotificationType.SYSTEM_NOTICE,
      `Recurring rule for "${fullRule.merchant}" has been automatically paused because its linked category is no longer available.`,
      { ruleId, merchant: fullRule.merchant, reason: 'CATEGORY_INACTIVE' },
    ).catch((err) => console.error('[Notification] Failed to notify category inactive for recurring rule:', err));
    throw AppError.BadRequest('Target category is inactive or deleted. Rule deactivated.', 'CATEGORY_INACTIVE');
  }

  const [transaction] = await prisma.$transaction([
    // 1. Create EXPENSE transaction
    prisma.transaction.create({
      data: {
        userId:          fullRule.userId,
        walletId:        fullRule.walletId,
        categoryId:      fullRule.categoryId,
        type:            TransactionType.EXPENSE,
        amount:          fullRule.amount,
        transactionDate: new Date(),
        source:          TxSource.RECURRING,
        merchant:        fullRule.merchant,
        note:            `Auto-generated from recurring rule: ${fullRule.merchant}`,
        recurringRuleId: fullRule.id,
      },
    }),
    // 2. Debit wallet balance
    prisma.wallet.update({
      where: { id: fullRule.walletId },
      data:  { currentBalance: { decrement: fullRule.amount } },
    }),
  ]);

  /* Asynchronously trigger automation execution notification in a failure-tolerant way to avoid blocking */
  notificationService.triggerNotification(
    fullRule.userId,
    NotificationType.AUTOMATION_TRIGGER,
    `Automated recurring transaction for ${fullRule.merchant} was processed successfully.`,
    {
      ruleId,
      transactionId: transaction.id
    }
  ).catch((err) => console.error('[Notification] Failed to trigger automation alert:', err));

  // Advance nextDueDate outside the transaction (non-critical)
  await recurringRuleRepo.updateNextDueDate(ruleId, fullRule.intervalDays);

  return {
    success: true,
    transactionId: transaction.id,
    amount: Number(fullRule.amount),
  };
};
