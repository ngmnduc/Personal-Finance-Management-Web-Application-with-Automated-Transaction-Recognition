import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  getAll,
  create,
  update,
  deleteRecord,
  internalGetDueToday,
  internalProcess,
} from '../controllers/recurringIncome.controller';

const router = Router();

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const createSchema = z.object({
  body: z.object({
    walletId:   z.string().uuid('walletId must be a valid UUID'),
    categoryId: z.string().uuid('categoryId must be a valid UUID'),
    name:       z.string().min(1, 'name is required').max(100, 'name must be 100 characters or less'),
    amount:     z.number({ message: 'amount must be a number' }).positive('amount must be positive'),
    dayOfMonth: z.number({ message: 'dayOfMonth must be a number' }).int().min(1).max(28),
    isActive:   z.boolean().optional().default(true),
  }),
});

const updateSchema = z.object({
  body: createSchema.shape.body.partial(),
});

// ─── Internal middleware ──────────────────────────────────────────────────────

const internalOnly = (req: Request, res: Response, next: NextFunction) => {
  if (req.headers['x-internal-secret'] !== process.env.INTERNAL_SECRET) {
    return res.status(403).json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' });
  }
  next();
};

// ─── Routes — internal first (no auth overlap) ───────────────────────────────

router.get('/due-today',      internalOnly, internalGetDueToday);
router.post('/:id/process',   internalOnly, internalProcess);

// ─── Routes — user-facing ────────────────────────────────────────────────────

router.get('/',    requireAuth, getAll);
router.post('/',   requireAuth, validateRequest(createSchema), create);
router.patch('/:id',  requireAuth, validateRequest(updateSchema), update);
router.delete('/:id', requireAuth, deleteRecord);

export default router;
