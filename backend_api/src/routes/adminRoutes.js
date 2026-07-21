import { Router } from 'express';
import * as controller from '../controllers/adminController.js';
import { requireAuth, requireRoles } from '../middleware/authMiddleware.js';
const router = Router();
router.use(requireAuth, requireRoles('admin'));
router.get('/admin/barbers', controller.listShops);
router.patch('/admin/barbers/:id/access', controller.updateAccess);
router.post('/admin/barbers/:id/password-reset', controller.resetPassword);
export default router;
