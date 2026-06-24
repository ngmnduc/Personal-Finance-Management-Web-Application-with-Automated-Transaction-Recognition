import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { create, findById, update, softDelete, findMany, getMonthlySummary } from '../controllers/transaction.controller';

const router = Router();

// All transaction routes require authentication
router.use(requireAuth);

// POST   /api/v1/transactions                
router.post('/', create);

// GET    /api/v1/transactions                
router.get('/', findMany);

// GET    /api/v1/transactions/summary/monthly 
// Must be registered BEFORE /:id to avoid Express matching "summary" as an id param
router.get('/summary/monthly', getMonthlySummary);

// GET    /api/v1/transactions/:id            
router.get('/:id', findById);

// PATCH  /api/v1/transactions/:id            
router.patch('/:id', update);

// DELETE /api/v1/transactions/:id            
router.delete('/:id', softDelete);

export default router;
