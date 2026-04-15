import { Request, Response, NextFunction } from "express";
import { dashboardService } from "../services/dashboard.service";
import { sendSuccess } from "../utils/response";

export const dashboardController = {
  getOverview: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      
      const overviewData = await dashboardService.getDashboardOverview(userId);
      
      sendSuccess(res, overviewData, "Get dashboard overview successfully", 200);
    } catch (error) {
      next(error);
    }
  },
};