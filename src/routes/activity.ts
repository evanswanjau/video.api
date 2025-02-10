// @ts-nocheck
import { Router } from 'express';
import { getUserActivity } from '../controllers/activity';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getUserActivity);

export default router;