// @ts-nocheck
import { Router } from 'express';
import { reportContent, getReports } from '../controllers/report';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, reportContent);
router.get('/', authenticate, getReports);

export default router;
