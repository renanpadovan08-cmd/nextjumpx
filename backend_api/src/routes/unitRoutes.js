import { Router } from 'express';
import * as c from '../controllers/unitController.js';
import { requireAuth, requireRoles } from '../middleware/authMiddleware.js';
import asyncHandler from '../wrapper.js';

const router = Router();
router.use(requireAuth);
router.get('/units/requests', requireRoles('admin', 'gerente', 'manager', 'owner'), asyncHandler(c.list));
router.post('/units/requests', requireRoles('admin', 'gerente', 'manager', 'owner'), asyncHandler(c.create));
router.patch('/units/requests/:id', requireRoles('admin'), asyncHandler(c.update));
router.get('/units', requireRoles('admin', 'gerente', 'manager', 'owner'), asyncHandler(c.configuration));
router.put('/units/barbers/:barberId', requireRoles('admin', 'gerente', 'manager', 'owner'), asyncHandler(c.assignBarber));
export default router;
