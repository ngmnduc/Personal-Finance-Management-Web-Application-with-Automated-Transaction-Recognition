import { Request, Response, NextFunction } from 'express';
import * as budgetService from '../services/budget.service';
import { sendSuccess } from '../utils/response';

// ── GET /api/v1/budgets ───────────────────────────────────────────────────────

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const period = req.query.period as string | undefined;

    const budgets = await budgetService.getAll(userId, period);
    sendSuccess(res, budgets, 'Budgets fetched successfully', 200);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/budgets ──────────────────────────────────────────────────────

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const budget = await budgetService.create(userId, req.body);
    sendSuccess(res, budget, 'Budget created successfully', 201);
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/v1/budgets/:id ─────────────────────────────────────────────────

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as { id: string };

    const budget = await budgetService.update(id, userId, req.body);
    sendSuccess(res, budget, 'Budget updated successfully', 200);
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/v1/budgets/:id ────────────────────────────────────────────────

export const softDelete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as { id: string };

    await budgetService.softDelete(id, userId);
    sendSuccess(res, null, 'Budget deleted successfully', 200);
  } catch (err) {
    next(err);
  }
};
