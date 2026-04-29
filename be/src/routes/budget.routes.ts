import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import { getAll, create, update, softDelete } from '../controllers/budget.controller';

const router = Router();

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const createSchema = z.object({
  body: z.object({
    categoryId: z.string().uuid('categoryId must be a valid UUID'),
    amountLimit: z.number({ message: 'amountLimit must be a number' }).positive('amountLimit must be positive'),
    period: z.enum(['WEEKLY', 'MONTHLY'], { error: 'period must be WEEKLY or MONTHLY' }),
  }),
});

const updateSchema = z.object({
  body: z.object({
    amountLimit: z.number({ message: 'amountLimit must be a number' }).positive('amountLimit must be positive'),
  }),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

router.get('/',     requireAuth, getAll);
router.post('/',    requireAuth, validateRequest(createSchema), create);
router.patch('/:id',  requireAuth, validateRequest(updateSchema), update);
router.delete('/:id', requireAuth, softDelete);

export default router;
