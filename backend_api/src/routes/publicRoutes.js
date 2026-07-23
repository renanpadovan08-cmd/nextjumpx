import { Router } from 'express';
import * as c from '../controllers/publicController.js';
import asyncHandler from '../wrapper.js';

const router = Router();
router.get('/public/booking/:login', asyncHandler(c.bookingContext));
router.get('/public/availability', asyncHandler(c.availability));
router.post('/public/appointments', asyncHandler(c.schedule));
export default router;
