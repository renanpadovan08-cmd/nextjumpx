import { Router } from 'express';
import * as c from '../controllers/businessController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import asyncHandler from '../wrapper.js';

const router = Router();
router.use(requireAuth);
router.get('/business/goals', asyncHandler(c.goals));
router.put('/business/goals', asyncHandler(c.saveGoal));
export default router;
