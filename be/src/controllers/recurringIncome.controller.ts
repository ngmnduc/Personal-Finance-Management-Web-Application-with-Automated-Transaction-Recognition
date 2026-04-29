import { Request, Response, NextFunction } from 'express';
import * as recurringService from '../services/recurringIncome.service';
import { sendSuccess } from '../utils/response';

// ─── User-facing handlers ─────────────────────────────────────────────────────

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const records = await recurringService.getAll(userId);
    sendSuccess(res, records, 'Recurring incomes fetched successfully', 200);
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const record = await recurringService.create(userId, req.body);
    sendSuccess(res, record, 'Recurring income created successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as { id: string };
    const record = await recurringService.update(id, userId, req.body);
    sendSuccess(res, record, 'Recurring income updated successfully', 200);
  } catch (err) {
    next(err);
  }
};

export const deleteRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as { id: string };
    await recurringService.deleteRecord(id, userId);
    sendSuccess(res, null, 'Recurring income deleted successfully', 200);
  } catch (err) {
    next(err);
  }
};

// ─── Internal / Cronjob handlers ─────────────────────────────────────────────

export const internalGetDueToday = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const records = await recurringService.getDueToday();
    sendSuccess(res, records, 'Due recurring incomes fetched', 200);
  } catch (err) {
    next(err);
  }
};

export const internalProcess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const result = await recurringService.processInternal(id);
    sendSuccess(res, result, 'Recurring income processed successfully', 200);
  } catch (err) {
    next(err);
  }
};
