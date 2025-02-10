// @ts-nocheck
import { Router } from 'express';
import { getUserActivity, getVideoActivities } from '../controllers/activity';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getUserActivity);
router.get('/videos/:id', getVideoActivities);

export default router;