import { Request, Response, NextFunction } from 'express';
import * as goalService from '../services/goal.service';
import { sendSuccess } from '../utils/response';
import { serializeBigInt } from '../utils/bigint';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const goals = await goalService.getAll(userId);
    sendSuccess(res, serializeBigInt(goals), 'Goals fetched successfully', 200);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as { id: string };
    const goal = await goalService.getById(id, userId);
    sendSuccess(res, serializeBigInt(goal), 'Goal fetched successfully', 200);
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const goal = await goalService.create(userId, req.body);
    sendSuccess(res, serializeBigInt(goal), 'Goal created successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as { id: string };
    const goal = await goalService.update(id, userId, req.body);
    sendSuccess(res, serializeBigInt(goal), 'Goal updated successfully', 200);
  } catch (err) {
    next(err);
  }
};

export const deleteGoal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as { id: string };
    const result = await goalService.deleteGoal(id, userId);
    sendSuccess(res, serializeBigInt(result), 'Goal abandoned and refunded successfully', 200);
  } catch (err) {
    next(err);
  }
};

export const deposit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params as { id: string };
    const result = await goalService.deposit(id, userId, req.body);
    sendSuccess(res, serializeBigInt(result), 'Deposit successful', 200);
  } catch (err) {
    next(err);
  }
};
