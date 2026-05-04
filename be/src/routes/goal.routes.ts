import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  getAll,
  getById,
  create,
  update,
  deleteGoal,
  deposit,
} from '../controllers/goal.controller';

const router = Router();

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const createSchema = z.object({
  body: z.object({
    sourceWalletId: z.string().uuid('sourceWalletId must be a valid UUID'),
    name: z.string().min(1, 'name is required').max(100, 'name must be 100 chars or less'),
    targetAmount: z.number({ message: 'targetAmount must be a number' }).positive('targetAmount must be positive'),
    deadline: z.string().datetime({ message: 'deadline must be a valid ISO date' }).optional(),
  }),
});

const updateSchema = z.object({
  body: createSchema.shape.body.omit({ sourceWalletId: true }).partial(),
});

const depositSchema = z.object({
  body: z.object({
    amount: z.number({ message: 'amount must be a number' }).positive('amount must be positive'),
  }),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

router.get('/',              requireAuth, getAll);
router.post('/',             requireAuth, validateRequest(createSchema), create);
router.get('/:id',           requireAuth, getById);
router.patch('/:id',         requireAuth, validateRequest(updateSchema), update);
router.delete('/:id',        requireAuth, deleteGoal);
router.post('/:id/deposit',  requireAuth, validateRequest(depositSchema), deposit);

export default router;
