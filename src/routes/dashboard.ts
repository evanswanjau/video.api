// @ts-nocheck
import { Router } from 'express';
import {
  getDashboardStats,
  getViewsStats,
  getEngagementStats,
} from '../controllers/dashboard';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/stats', authenticate, getDashboardStats);
router.get('/stats/views', authenticate, getViewsStats);
router.get('/stats/engagement', authenticate, getEngagementStats);

export default router;
