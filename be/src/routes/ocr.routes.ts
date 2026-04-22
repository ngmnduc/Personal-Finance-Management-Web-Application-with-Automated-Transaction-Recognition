import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import { scan, confirm, getBanks } from '../controllers/ocr.controller';

const router = Router();

// ── Multer (memory storage, max 10 MB) ───────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ── Zod schema for /confirm ───────────────────────────────────────────────────

const confirmSchema = z.object({
  body: z.object({
    amount: z.number({ invalid_type_error: 'amount must be a number' }).positive('amount must be positive'),
    transactionDate: z.string().min(1, 'transactionDate is required'),
    type: z.enum(['INCOME', 'EXPENSE'], { error: 'type must be INCOME or EXPENSE' }),
    categoryId: z.string().uuid('categoryId must be a valid UUID'),
    walletId: z.string().uuid('walletId must be a valid UUID'),
    extractedText: z.string().optional(),
    merchant: z.string().optional(),
    note: z.string().optional(),
  }),
});

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/v1/ocr/scan
// requireAuth first, then multer parses the multipart body
router.post('/scan', requireAuth, upload.single('file'), scan);

// POST /api/v1/ocr/confirm
router.post('/confirm', requireAuth, validateRequest(confirmSchema), confirm);

// GET /api/v1/ocr/banks
router.get('/banks', requireAuth, getBanks);

export default router;
