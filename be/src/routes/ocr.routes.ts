import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import { scan, confirm, getBanks, scanBulk } from '../controllers/ocr.controller';
import { sendError } from '../utils/response';

const router = Router();

// ── Rate Limiting chuyên biệt cho OCR Upload (Chống spam RAM/OOM) ───────────────
const ocrUploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 phút
  max: 5, // Tối đa 5 lần upload (single hoặc bulk)
  handler: (req, res) => {
    return sendError(
      res,
      'Too many OCR scan requests. Please try again after 5 minutes.',
      'RATE_LIMITED',
      429
    );
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Multer (memory storage, max 10 MB) ───────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ── Zod schema for /confirm ───────────────────────────────────────────────────

const confirmSchema = z.object({
  body: z.object({
    amount: z.number({ message: 'amount must be a number' }).positive('amount must be positive'),
    transactionDate: z.string().min(1, 'transactionDate is required'),
    type: z.enum(['INCOME', 'EXPENSE'], { error: 'type must be INCOME or EXPENSE' }),
    categoryId: z.string().min(1, 'categoryId is required'),
    walletId: z.string().uuid('walletId must be a valid UUID'),
    extractedText: z.string().optional(),
    merchant: z.string().optional(),
    note: z.string().optional(),
  }),
});

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/v1/ocr/scan
router.post(
  '/scan',
  requireAuth,
  ocrUploadLimiter,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return sendError(res, 'File too large. Maximum 10MB.', 'FILE_TOO_LARGE', 400);
        }
      }
      if (err) return next(err);
      next();
    });
  },
  scan,
);

// POST /api/v1/ocr/confirm
router.post('/confirm', requireAuth, validateRequest(confirmSchema), confirm);

// GET /api/v1/ocr/banks
router.get('/banks', requireAuth, getBanks);

// POST /api/v1/ocr/bulk
router.post(
  '/bulk',
  requireAuth,
  ocrUploadLimiter,
  (req, res, next) => {
    // Chỉ cho phép tối đa 10 file để tránh OOM (tối đa 100MB RAM)
    upload.array('files', 10)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return sendError(res, 'Too many files. Maximum 10 files allowed for bulk scan.', 'TOO_MANY_FILES', 400);
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          return sendError(res, 'One or more files too large. Maximum 10MB per file.', 'FILE_TOO_LARGE', 400);
        }
      }
      if (err) return next(err);
      next();
    });
  },
  scanBulk,
);

export default router;
