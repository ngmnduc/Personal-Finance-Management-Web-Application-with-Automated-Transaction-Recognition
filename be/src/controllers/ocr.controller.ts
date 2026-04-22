import { Request, Response, NextFunction } from 'express';
import * as ocrService from '../services/ocr.service';
import { sendSuccess } from '../utils/response';

// ── POST /api/v1/ocr/scan ─────────────────────────────────────────────────────

export const scan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded. Please attach an image or PDF.',
        code: 'MISSING_FILE',
      });
      return;
    }

    const scanContext: string = req.body.scan_context ?? 'EXPENSE';
    const userId = req.user!.userId;

    const result = await ocrService.scan(req.file, scanContext, userId);
    sendSuccess(res, result, 'File scanned successfully', 200);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/ocr/confirm ──────────────────────────────────────────────────

export const confirm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const result = await ocrService.confirm(req.body, userId);
    sendSuccess(res, result, 'Transaction confirmed successfully', 201);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/ocr/banks ─────────────────────────────────────────────────────

export const getBanks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const banks = await ocrService.getBanks();
    sendSuccess(res, banks, 'Supported banks fetched successfully', 200);
  } catch (err) {
    next(err);
  }
};
