import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/errors';
import { serializeBigInt } from '../utils/bigint';

export const dashboardController = {
  getOverview: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const month = req.query.month as string | undefined;
      const walletId = req.query.walletId as string | undefined;
      const data   = await dashboardService.getDashboardOverview(userId, month, walletId);
      sendSuccess(res, serializeBigInt(data), 'Get dashboard overview successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  // GET /dashboard/goals/summary
  getGoalsSummary: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const goals  = await dashboardService.getGoalsSummary(userId);
      sendSuccess(res, serializeBigInt(goals), 'Goals summary fetched successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  // GET /dashboard/charts/monthly?year=2026
  getMonthlyCharts: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId      = req.user!.userId;
      const yearParam   = req.query.year as string | undefined;
      const year        = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

      if (isNaN(year)) {
        throw AppError.BadRequest('Invalid year parameter');
      }

      const data = await dashboardService.getMonthlyCharts(userId, year);
      sendSuccess(res, serializeBigInt(data), 'Monthly chart data fetched successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  // GET /dashboard/charts/categories?month=2026-05
  getCategoryBreakdown: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId     = req.user!.userId;
      const monthParam = req.query.month as string | undefined;

      // Default to current month in YYYY-MM format
      const now          = new Date();
      const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const month        = monthParam ?? defaultMonth;

      // Validate format
      if (!/^\d{4}-\d{2}$/.test(month)) {
        throw AppError.BadRequest('Invalid month format. Use YYYY-MM');
      }

      const data = await dashboardService.getCategoryBreakdown(userId, month);
      sendSuccess(res, serializeBigInt(data), 'Category breakdown fetched successfully', 200);
    } catch (error) {
      next(error);
    }
  },
};