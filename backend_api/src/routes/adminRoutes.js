import { Router } from 'express';
import * as controller from '../controllers/adminController.js';
import { requireAuth, requireRoles } from '../middleware/authMiddleware.js';
import asyncHandler from '../wrapper.js';
const router = Router();
// Keep the administrator guard scoped to /admin. Registered at the router
// root it also intercepted every route mounted after adminRoutes (including
// /operations/profile) and returned 403 to valid shop managers.
router.use('/admin', requireAuth, requireRoles('admin'));
router.get('/admin/barbers', asyncHandler(controller.listShops));
router.patch('/admin/barbers/:id/access', asyncHandler(controller.updateAccess));
router.post('/admin/barbers/:id/password-reset', asyncHandler(controller.resetPassword));
router.post('/admin/barbers', asyncHandler(controller.createAccount));
router.put('/admin/barbers/:id/settings', asyncHandler(controller.updateSettings));
router.post('/admin/barbers/:id/payment', asyncHandler(controller.markPaid));
router.put('/admin/barbers/:id/cash-password', asyncHandler(controller.setCashPassword));
router.delete('/admin/barbers/:id', asyncHandler(controller.deleteAccount));
export default router;
