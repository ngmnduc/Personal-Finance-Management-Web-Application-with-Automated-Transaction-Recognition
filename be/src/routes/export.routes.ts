import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { exportCSV, exportPDF } from '../controllers/export.controller';

const router = Router();
router.use(requireAuth);

router.get('/transactions/csv', exportCSV);
router.get('/transactions/pdf', exportPDF);

export default router;
