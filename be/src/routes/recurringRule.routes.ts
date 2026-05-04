import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  getSuggestions,
  getActiveRules,
  confirmRule,
  snoozeRule,
  deleteRule,
  internalOnly,
  getDueRules,
  processRule,
} from '../controllers/recurringRule.controller';

const router = Router();

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const confirmSchema = z.object({
  body: z.object({
    ruleId: z.string().uuid('ruleId must be a valid UUID'),
  }),
});

const snoozeSchema = z.object({
  params: z.object({
    id: z.string().uuid('id must be a valid UUID'),
  }),
});

// ─── User-facing routes (JWT protected) ───────────────────────────────────────

router.get('/suggestions',             requireAuth, getSuggestions);
router.post('/rules',                  requireAuth, validateRequest(confirmSchema), confirmRule);
router.get('/rules',                   requireAuth, getActiveRules);
router.patch('/rules/:id',             requireAuth, deleteRule); // kept for future update endpoint
router.delete('/rules/:id',            requireAuth, deleteRule);
router.post('/suggestions/:id/snooze', requireAuth, validateRequest(snoozeSchema), snoozeRule);

// ─── Internal routes (Cronjob only — protected by X-Internal-Secret) ──────────

router.get('/rules/due-today',    internalOnly, getDueRules);
router.post('/rules/:id/process', internalOnly, processRule);

export default router;
