import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { create, findById, update, softDelete, findMany, getMonthlySummary } from '../controllers/transaction.controller';

const router = Router();

// All transaction routes require authentication
router.use(requireAuth);

// POST   /api/v1/transactions                → create
router.post('/', create);

// GET    /api/v1/transactions                → findMany (list with filters)
router.get('/', findMany);

// GET    /api/v1/transactions/summary/monthly → getMonthlySummary
// Must be registered BEFORE /:id to avoid Express matching "summary" as an id param
router.get('/summary/monthly', getMonthlySummary);

// GET    /api/v1/transactions/:id            → findById
router.get('/:id', findById);

// PATCH  /api/v1/transactions/:id            → update
router.patch('/:id', update);

// DELETE /api/v1/transactions/:id            → softDelete
router.delete('/:id', softDelete);

export default router;
