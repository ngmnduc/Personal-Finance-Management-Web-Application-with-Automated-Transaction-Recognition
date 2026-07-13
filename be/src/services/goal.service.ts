import { AppError } from '../utils/errors';
import { walletRepository } from '../repositories/wallet.repository';
import * as goalRepo from '../repositories/goal.repository';

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CreateGoalInput {
  sourceWalletId: string;
  name: string;
  targetAmount: number;
  deadline?: string; // ISO date string from request body
}

export interface UpdateGoalInput {
  name?: string;
  targetAmount?: number;
  deadline?: string;
}

export interface DepositInput {
  amount: number;
}

// ─── Serialisation helpers ────────────────────────────────────────────────────

const calcProgress = (current: bigint, target: bigint): number =>
  target > 0n
    ? Math.min(Math.round((Number(current) / Number(target)) * 100), 100)
    : 0;

const serialiseGoal = (goal: any) => ({
  ...goal,
  targetAmount: Number(goal.targetAmount),
  currentAmount: Number(goal.currentAmount),
  progressPercent: calcProgress(goal.currentAmount, goal.targetAmount),
  sourceWallet: goal.sourceWallet
    ? {
        ...goal.sourceWallet,
        currentBalance: Number(goal.sourceWallet.currentBalance),
      }
    : undefined,
});

const serialiseWallet = (wallet: any) => ({
  ...wallet,
  initialBalance: wallet.initialBalance !== undefined ? Number(wallet.initialBalance) : undefined,
  currentBalance: Number(wallet.currentBalance),
});

// ─── Service functions ────────────────────────────────────────────────────────

export const getAll = async (userId: string) => {
  const goals = await goalRepo.findManyByUser(userId);
  return goals.map(serialiseGoal);
};

export const getById = async (id: string, userId: string) => {
  const goal = await goalRepo.findById(id, userId);
  if (!goal) throw AppError.NotFound('Goal not found.', 'GOAL_NOT_FOUND');
  return serialiseGoal(goal);
};

export const create = async (userId: string, input: CreateGoalInput) => {
  if (input.targetAmount <= 0) {
    throw AppError.BadRequest('targetAmount must be greater than 0.', 'INVALID_AMOUNT');
  }

  // Validate wallet is active (not deleted or archived)
  const wallet = await walletRepository.findActiveByIdAndUserId(input.sourceWalletId, userId);
  if (!wallet) {
    throw AppError.NotFound(
      'Wallet not found, archived or does not belong to you.',
      'WALLET_NOT_FOUND',
    );
  }

  const goal = await goalRepo.create({
    userId,
    sourceWalletId: input.sourceWalletId,
    name: input.name,
    targetAmount: BigInt(input.targetAmount),
    deadline: input.deadline ? new Date(input.deadline) : undefined,
  });

  return serialiseGoal(goal);
};

export const update = async (id: string, userId: string, input: UpdateGoalInput) => {
  const existing = await goalRepo.findById(id, userId);
  if (!existing) throw AppError.NotFound('Goal not found.', 'GOAL_NOT_FOUND');

  if (existing.status !== 'ACTIVE') {
    throw AppError.BadRequest('Only ACTIVE goals can be updated.', 'GOAL_NOT_ACTIVE');
  }

  if (input.targetAmount !== undefined && input.targetAmount <= 0) {
    throw AppError.BadRequest('targetAmount must be greater than 0.', 'INVALID_AMOUNT');
  }

  const updated = await goalRepo.update(id, {
    name: input.name,
    targetAmount: input.targetAmount !== undefined ? BigInt(input.targetAmount) : undefined,
    deadline: input.deadline ? new Date(input.deadline) : undefined,
  });

  return serialiseGoal(updated);
};

export const deposit = async (id: string, userId: string, input: DepositInput) => {
  const goal = await goalRepo.findById(id, userId);
  if (!goal) throw AppError.NotFound('Goal not found.', 'GOAL_NOT_FOUND');

  if (goal.status !== 'ACTIVE') {
    throw AppError.BadRequest('Only ACTIVE goals accept deposits.', 'GOAL_NOT_ACTIVE');
  }

  if (input.amount <= 0) {
    throw AppError.BadRequest('amount must be greater than 0.', 'INVALID_AMOUNT');
  }

  const missingAmount = goal.targetAmount - goal.currentAmount;
  if (missingAmount <= 0n) {
    throw AppError.BadRequest('Goal is already fully funded.', 'GOAL_FULLY_FUNDED');
  }

  const requestedAmount = BigInt(input.amount);
  const actualDeposit = requestedAmount > missingAmount ? missingAmount : requestedAmount;

  const wallet = await walletRepository.findActiveByIdAndUserId(goal.sourceWalletId, userId);
  if (!wallet) {
    throw AppError.NotFound('Source wallet not found or inactive.', 'WALLET_NOT_FOUND');
  }
  if (BigInt(wallet.currentBalance) < actualDeposit) {
    throw AppError.BadRequest('Insufficient wallet balance.', 'INSUFFICIENT_BALANCE');
  }

  const [updatedGoal, updatedWallet] = await goalRepo.deposit(id, actualDeposit, goal.sourceWalletId);

  if (updatedGoal.currentAmount >= updatedGoal.targetAmount) {
    const completed = await goalRepo.completeGoal(id);
    return {
      goal: serialiseGoal(completed),
      wallet: serialiseWallet(updatedWallet),
      autoCompleted: true,
      actualDeposit: Number(actualDeposit),
    };
  }

  return {
    goal: serialiseGoal(updatedGoal),
    wallet: serialiseWallet(updatedWallet),
    autoCompleted: false,
    actualDeposit: Number(actualDeposit),
  };
}

export const deleteGoal = async (id: string, userId: string) => {
  const goal = await goalRepo.findById(id, userId);
  if (!goal) throw AppError.NotFound('Goal not found.', 'GOAL_NOT_FOUND');

  if (goal.status === 'ABANDONED') {
    throw AppError.BadRequest('Goal is already abandoned.', 'GOAL_ALREADY_ABANDONED');
  }

  const refundAmount = goal.currentAmount;

  const [updatedGoal, updatedWallet, refundTx] = await goalRepo.abandonGoal(
    id,
    refundAmount,
    goal.sourceWalletId,
    goal.name,
    userId,
  );

  return {
    refundedAmount: Number(refundAmount),
    goal: serialiseGoal(updatedGoal),
    wallet: serialiseWallet(updatedWallet),
    refundTransaction: { id: refundTx.id, amount: Number(refundTx.amount) },
  };
};

// ─── Dashboard summary ────────────────────────────────────────────────────────

export const getGoalsSummary = async (userId: string) => {
  const goals = await goalRepo.findTopActive(userId, 3);
  return goals.map(serialiseGoal);
};
