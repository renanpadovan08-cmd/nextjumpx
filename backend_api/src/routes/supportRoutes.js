import { Router } from 'express';
import * as controller from '../controllers/supportController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import asyncHandler from '../wrapper.js';

const router = Router();
router.use(requireAuth);
router.get('/support/conversations', asyncHandler(controller.listConversations));
router.post('/support/conversations/ensure', asyncHandler(controller.ensureConversation));
router.get('/support/conversations/:id/messages', asyncHandler(controller.listMessages));
router.post('/support/conversations/:id/messages', asyncHandler(controller.sendMessage));
router.patch('/support/conversations/:id', asyncHandler(controller.updateConversation));
export default router;
