import { Router } from 'express';
import * as controller from '../controllers/updatesController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import asyncHandler from '../wrapper.js';

const router = Router();
router.use(requireAuth);
router.get('/updates', asyncHandler(controller.listUpdates));
router.post('/updates/:id/view', asyncHandler(controller.markViewed));
export default router;
