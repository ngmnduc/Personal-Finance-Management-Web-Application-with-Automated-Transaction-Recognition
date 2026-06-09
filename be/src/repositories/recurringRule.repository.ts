import { prisma } from '../config/prisma';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateRecurringRuleDto {
  userId: string;
  categoryId: string;
  walletId: string;
  merchant: string;
  amount: bigint;
  intervalDays?: number;
  nextDueDate?: Date;
}

export interface UpdateRecurringRuleDto {
  categoryId?: string;
  walletId?: string;
  merchant?: string;
  amount?: bigint;
  intervalDays?: number;
  nextDueDate?: Date;
  isActive?: boolean;
}

// ─── Shared include ───────────────────────────────────────────────────────────

const withRelations = {
  category: { select: { id: true, name: true, icon: true } },
  wallet:   { select: { id: true, name: true } },
} as const;

// ─── Repository functions ─────────────────────────────────────────────────────

/**
 * Pending suggestions for a user: isActive=false and not currently snoozed.
 */
export const findSuggestions = (userId: string) =>
  prisma.recurringRule.findMany({
    where: {
      userId,
      isActive: false,
      deletedAt: null,
      OR: [
        { snoozeUntil: null },
        { snoozeUntil: { lt: new Date() } },
      ],
    },
    include: withRelations,
    orderBy: { createdAt: 'desc' },
  });

/**
 * Active rules confirmed by the user (isActive=true).
 */
export const findActiveRules = (userId: string) =>
  prisma.recurringRule.findMany({
    where: { userId, isActive: true, deletedAt: null },
    include: withRelations,
    orderBy: { nextDueDate: 'asc' },
  });

/**
 * Find a single rule by id scoped to userId.
 */
export const findById = (id: string, userId: string) =>
  prisma.recurringRule.findFirst({
    where: { id, userId, deletedAt: null },
    include: withRelations,
  });

/**
 * Check for an existing rule (active or pending) to prevent duplicates.
 */
export const findExistingRule = (userId: string, merchant: string, amount: bigint) =>
  prisma.recurringRule.findFirst({
    where: { userId, merchant, amount },
  });

/**
 * Create a new rule.
 * IMPORTANT: isActive is ALWAYS false on creation — requires explicit user confirmation.
 */
export const create = (data: CreateRecurringRuleDto) =>
  prisma.recurringRule.create({
    data: {
      ...data,
      isActive: false, // Mandatory: pending user confirmation
    },
    include: withRelations,
  });

/**
 * Confirm a suggestion — user has approved it, flip isActive to true.
 */
export const confirmRule = (id: string) =>
  prisma.recurringRule.update({
    where: { id },
    data: { isActive: true },
    include: withRelations,
  });

/**
 * General update for amount, category, wallet, intervalDays, etc.
 */
export const update = (id: string, data: UpdateRecurringRuleDto) =>
  prisma.recurringRule.update({
    where: { id },
    data,
    include: withRelations,
  });

/**
 * Snooze a suggestion — hide it from the suggestions list for `days` days.
 */
export const snooze = (id: string, days = 60) => {
  const snoozeUntil = new Date();
  snoozeUntil.setDate(snoozeUntil.getDate() + days);
  return prisma.recurringRule.update({
    where: { id },
    data: { snoozeUntil },
  });
};

/**
 * Soft-delete a recurring rule.
 */
export const softDelete = (id: string) =>
  prisma.recurringRule.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

/**
 * For cronjob: all active rules whose nextDueDate has passed (or is today).
 */
export const findDueRules = () =>
  prisma.recurringRule.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      nextDueDate: { lte: new Date() },
    },
    include: {
      ...withRelations,
      wallet: true,
      category: true,
    },
  });

/**
 * After processing a rule, advance nextDueDate by intervalDays.
 */
export const updateNextDueDate = async (id: string, intervalDays: number) => {
  const rule = await prisma.recurringRule.findUnique({
    where: { id },
    select: { nextDueDate: true },
  });

  // Determine base starting point without systemic drifting
  const next = rule?.nextDueDate ? new Date(rule.nextDueDate) : new Date();
  next.setDate(next.getDate() + intervalDays);

  return prisma.recurringRule.update({
    where: { id },
    data: { nextDueDate: next },
  });
};
