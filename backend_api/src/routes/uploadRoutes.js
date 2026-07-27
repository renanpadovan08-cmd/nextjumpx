import { Router } from 'express';
import { uploadImage } from '../controllers/uploadController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import asyncHandler from '../wrapper.js';

const router = Router();
router.post('/uploads/images', requireAuth, asyncHandler(uploadImage));
export default router;
