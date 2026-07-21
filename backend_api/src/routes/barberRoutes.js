import { Router } from 'express';
import * as controller from '../controllers/barberController.js';
import { requireAuth, requireRoles } from '../middleware/authMiddleware.js';
const router = Router();
router.get('/barbers/public/:shopName', controller.publicBarbers);
router.get('/barbers', requireAuth, controller.listBarbers);
router.post('/barbers', requireAuth, requireRoles('admin', 'gerente'), controller.createBarber);
router.patch('/barbers/:id', requireAuth, controller.updateBarber);
export default router;
