import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { create, findById, update, softDelete, findMany, getMonthlySummary } from '../controllers/transaction.controller';

const router = Router();

router.use(requireAuth);

router.post('/', create);

router.get('/', findMany);

// Must be registered BEFORE /:id to avoid Express matching "summary" as an id param
router.get('/summary/monthly', getMonthlySummary);

router.get('/:id', findById);

router.patch('/:id', update);

router.delete('/:id', softDelete);

export default router;
