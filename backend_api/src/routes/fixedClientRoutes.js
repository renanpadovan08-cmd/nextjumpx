import { Router } from 'express';
import * as c from '../controllers/fixedClientController.js';
import { requireAuth, requireRoles } from '../middleware/authMiddleware.js';
import asyncHandler from '../wrapper.js';

const router = Router();
router.use(requireAuth);
router.get('/fixed-clients', asyncHandler(c.list));
router.post('/fixed-clients', requireRoles('admin', 'gerente'), asyncHandler(c.create));
router.patch('/fixed-clients/payments/:id', requireRoles('admin', 'gerente'), asyncHandler(c.pay));
router.delete('/fixed-clients/:code', requireRoles('admin', 'gerente'), asyncHandler(c.cancel));
export default router;
