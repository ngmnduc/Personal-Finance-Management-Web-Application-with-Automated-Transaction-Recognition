import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import { sendSuccess } from "../utils/response";

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.register(req.body);
    sendSuccess(res, user, "Registered successfully", 201);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await authService.login(req.body);
    sendSuccess(res, data, "Logged in successfully", 200);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const { userId } = req.user!; 
    
    await authService.logout(userId);
    sendSuccess(res, null, "Logged out successfully", 200);
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    const data = await authService.refresh(refreshToken);
    sendSuccess(res, data, "Token refreshed successfully", 200);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const user = await authService.getMe(userId);
    sendSuccess(res, user, "Get profile successfully", 200);
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    const user = await authService.updateMe(userId, req.body);
    sendSuccess(res, user, "Updated profile successfully", 200);
  } catch (error) {
    next(error);
  }
};