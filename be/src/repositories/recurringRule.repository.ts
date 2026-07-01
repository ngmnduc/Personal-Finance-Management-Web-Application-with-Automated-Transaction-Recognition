import { prisma } from '../config/prisma';

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

const withRelations = {
  category: { select: { id: true, name: true, icon: true } },
  wallet:   { select: { id: true, name: true } },
} as const;

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

export const confirmRule = (id: string) =>
  prisma.recurringRule.update({
    where: { id },
    data: { isActive: true },
    include: withRelations,
  });

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

export const softDelete = (id: string) =>
  prisma.recurringRule.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

/** For cronjob: active rules whose nextDueDate has passed */
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

/** Advance nextDueDate by intervalDays after processing */
export const updateNextDueDate = async (id: string, intervalDays: number) => {
  const rule = await prisma.recurringRule.findUnique({
    where: { id },
    select: { nextDueDate: true },
  });

  const next = rule?.nextDueDate ? new Date(rule.nextDueDate) : new Date();
  next.setDate(next.getDate() + intervalDays);

  return prisma.recurringRule.update({
    where: { id },
    data: { nextDueDate: next },
  });
};
