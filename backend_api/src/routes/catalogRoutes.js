import { Router } from 'express';
import * as controller from '../controllers/catalogController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
const router = Router();
router.get('/services', requireAuth, controller.listServices);
router.post('/services', requireAuth, controller.createService);
router.patch('/services/:id', requireAuth, controller.updateService);
router.delete('/services/:id', requireAuth, controller.deleteService);
export default router;
