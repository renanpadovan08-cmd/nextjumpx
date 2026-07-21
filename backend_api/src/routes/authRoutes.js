import { Router } from 'express';
import * as controller from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
const router = Router();
router.post('/auth/login', controller.login);
router.post('/auth/signup', controller.signup);
router.get('/auth/me', requireAuth, controller.me);
export default router;
