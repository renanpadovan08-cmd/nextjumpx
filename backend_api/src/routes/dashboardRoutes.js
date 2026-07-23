import { Router } from 'express';
import { summary } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import asyncHandler from '../wrapper.js';
const router = Router();
router.get('/dashboard/summary', requireAuth, asyncHandler(summary));
export default router;
