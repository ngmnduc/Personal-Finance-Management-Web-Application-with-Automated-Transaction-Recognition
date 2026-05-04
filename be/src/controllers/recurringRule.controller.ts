import { Request, Response, NextFunction } from 'express';
import * as recurringRuleService from '../services/recurringRule.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/errors';
import { prisma } from '../config/prisma';

// ─── User-facing controllers ──────────────────────────────────────────────────

export const getSuggestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const data = await recurringRuleService.getSuggestions(userId);
    sendSuccess(res, data, 'Suggestions fetched successfully');
  } catch (err) {
    next(err);
  }
};

export const getActiveRules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const data = await recurringRuleService.getActiveRules(userId);
    sendSuccess(res, data, 'Active rules fetched successfully');
  } catch (err) {
    next(err);
  }
};

export const confirmRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const ruleId: string = req.body.ruleId;
    const rule = await recurringRuleService.confirmRule(userId, ruleId);
    sendSuccess(res, rule, 'Recurring rule confirmed and activated', 200);
  } catch (err) {
    next(err);
  }
};

export const snoozeRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as { id: string };
    const rule = await recurringRuleService.snoozeRule(userId, id);
    sendSuccess(res, rule, 'Suggestion snoozed for 60 days');
  } catch (err) {
    next(err);
  }
};

export const deleteRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as { id: string };
    await recurringRuleService.deleteRule(userId, id);
    sendSuccess(res, null, 'Recurring rule deleted');
  } catch (err) {
    next(err);
  }
};

// ─── Internal middleware: protect internal-only endpoints ─────────────────────

export const internalOnly = (req: Request, res: Response, next: NextFunction) => {
  const secret = req.headers['x-internal-secret'];
  if (!secret || secret !== process.env.INTERNAL_SECRET) {
    return next(AppError.Forbidden('Forbidden: invalid internal secret.', 'FORBIDDEN'));
  }
  next();
};

// ─── Internal / Cronjob controllers ──────────────────────────────────────────

export const getDueRules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = await recurringRuleService.getDueRules();
    sendSuccess(res, rules, 'Due rules fetched');
  } catch (err) {
    next(err);
  }
};

export const processRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const result = await recurringRuleService.processRule(id);
    sendSuccess(res, result, 'Recurring rule processed successfully');
  } catch (err) {
    next(err);
  }
};
