import { Router } from 'express';
import { summary } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
const router = Router();
router.get('/dashboard/summary', requireAuth, summary);
export default router;
