import { prisma } from '../config/prisma';

// ─── DTO Types ────────────────────────────────────────────────────────────────

export interface CreateGoalDto {
  userId: string;
  sourceWalletId: string;
  name: string;
  targetAmount: bigint;
  deadline?: Date;
}

export interface UpdateGoalDto {
  name?: string;
  targetAmount?: bigint;
  deadline?: Date;
}

// ─── Shared include ───────────────────────────────────────────────────────────

const withSourceWallet = {
  sourceWallet: {
    select: { id: true, name: true, type: true, currentBalance: true },
  },
} as const;

// ─── Queries ──────────────────────────────────────────────────────────────────

export const findManyByUser = (userId: string) =>
  prisma.savingGoal.findMany({
    where: { userId, deletedAt: null },
    include: withSourceWallet,
    orderBy: { createdAt: 'desc' },
  });

export const findById = (id: string, userId: string) =>
  prisma.savingGoal.findFirst({
    where: { id, userId, deletedAt: null },
    include: withSourceWallet,
  });

export const create = (data: CreateGoalDto) =>
  prisma.savingGoal.create({
    data: {
      ...data,
      status: 'ACTIVE',
    },
    include: withSourceWallet,
  });

export const update = (id: string, data: UpdateGoalDto) =>
  prisma.savingGoal.update({
    where: { id },
    data,
    include: withSourceWallet,
  });

// ─── Atomic: Deposit (increment goal + decrement wallet) ──────────────────────

export const deposit = async (id: string, amount: bigint, walletId: string) => {
  const [updatedGoal, updatedWallet] = await prisma.$transaction([
    prisma.savingGoal.update({
      where: { id },
      data: { currentAmount: { increment: amount } },
      include: withSourceWallet,
    }),
    prisma.wallet.update({
      where: { id: walletId },
      data: { currentBalance: { decrement: amount } },
    }),
  ]);

  return [updatedGoal, updatedWallet] as const;
};

// ─── Mark goal as COMPLETED ───────────────────────────────────────────────────

export const completeGoal = (id: string) =>
  prisma.savingGoal.update({
    where: { id },
    data: { status: 'COMPLETED' },
    include: withSourceWallet,
  });

// ─── Atomic: Abandon + refund + create INCOME transaction ────────────────────

export const abandonGoal = async (
  id: string,
  refundAmount: bigint,
  walletId: string,
  goalName: string,
  userId: string,
) => {
  // Dynamically resolve system INCOME category — no hardcoded IDs.
  // Priority 1: default system category whose name contains "khác".
  // Priority 2: any system INCOME category (userId: null).
  let category = await prisma.category.findFirst({
    where: {
      userId: null,
      type: 'INCOME',
      isDefault: true,
      name: { contains: 'khác', mode: 'insensitive' },
    },
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        name: 'Thu nhập khác',
        type: 'INCOME',
        isDefault: true,
        icon: 'plus-circle', // Default icon for other income
      },
    });
  }

  if (!category) {
    throw new Error('No system INCOME category found for refund transaction.');
  }

  const categoryId = category.id;

  const [updatedGoal, updatedWallet, refundTx] = await prisma.$transaction([
    // 1. Mark goal ABANDONED and soft-delete
    prisma.savingGoal.update({
      where: { id },
      data: { status: 'ABANDONED', deletedAt: new Date() },
      include: withSourceWallet,
    }),
    // 2. Refund the saved amount to the source wallet
    prisma.wallet.update({
      where: { id: walletId },
      data: { currentBalance: { increment: refundAmount } },
    }),
    // 3. Create an INCOME transaction for the refund (dynamically resolved categoryId)
    prisma.transaction.create({
      data: {
        userId,
        walletId,
        categoryId,
        type: 'INCOME',
        amount: refundAmount,
        transactionDate: new Date(),
        source: 'MANUAL',
        note: `Refund from goal: ${goalName}`,
      },
    }),
  ]);

  return [updatedGoal, updatedWallet, refundTx] as const;
};

// ─── Dashboard: top N active goals ───────────────────────────────────────────

export const findTopActive = (userId: string, limit = 3) =>
  prisma.savingGoal.findMany({
    where: { userId, status: 'ACTIVE', deletedAt: null },
    include: withSourceWallet,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
