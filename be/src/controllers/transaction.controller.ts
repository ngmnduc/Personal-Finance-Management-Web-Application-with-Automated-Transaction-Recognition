import { Request, Response, NextFunction } from 'express';
import * as transactionService from '../services/transaction.service';
import { sendSuccess } from '../utils/response';
import { getPaginationMeta } from '../utils/pagination';

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { walletId, categoryId, type, amount, transactionDate, merchant, note } = req.body;

    const { transaction, budget_alert } = await transactionService.create(userId, {
      walletId,
      categoryId,
      type,
      amount,
      transactionDate,
      merchant,
      note,
    });

    sendSuccess(res, { transaction, budget_alert }, 'Transaction created successfully', 201);
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────

export const findById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as { id: string };

    const transaction = await transactionService.findById(id, userId);

    sendSuccess(res, transaction, 'Transaction fetched successfully', 200);
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as { id: string };
    const { walletId, categoryId, type, amount, transactionDate, merchant, note } = req.body;

    const transaction = await transactionService.update(id, userId, {
      walletId,
      categoryId,
      type,
      amount,
      transactionDate,
      merchant,
      note,
    });

    sendSuccess(res, transaction, 'Transaction updated successfully', 200);
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────

export const softDelete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as { id: string };

    await transactionService.softDelete(id, userId);

    sendSuccess(res, null, 'Transaction deleted successfully', 200);
  } catch (err) {
    next(err);
  }
};

// ─── History & Summary ────────────────────────────────────────────────────────

export const findMany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 20);

    const { data, total } = await transactionService.findMany(userId, {
      page,
      limit,
      type:       req.query.type       as string | undefined,
      categoryId: req.query.category_id as string | undefined,
      walletId:   req.query.wallet_id   as string | undefined,
      startDate:  (req.query.start_date || req.query.from) as string | undefined,
      endDate:    (req.query.end_date || req.query.to)     as string | undefined,
      search:     req.query.search     as string | undefined,
    });

    const pagination = getPaginationMeta(total, page, limit);

    sendSuccess(res, { transactions: data, pagination }, 'Transactions fetched successfully', 200);
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────────

export const getMonthlySummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const walletId = (req.query.wallet_id || req.query.walletId) as string | undefined;

    const summary = await transactionService.getMonthlySummary(userId, year, walletId);

    sendSuccess(res, summary, 'Monthly summary fetched successfully', 200);
  } catch (err) {
    next(err);
  }
};
