// @ts-nocheck
import { Router } from 'express';
import {
  addComment,
  updateComment,
  deleteComment,
  getCommentsByVideo,
  getRepliesByComment,
} from '../controllers/comment';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, addComment);
router.put('/:id', authenticate, updateComment);
router.delete('/:id', authenticate, deleteComment);
router.get('/video/:videoId', getCommentsByVideo);
router.get('/replies/:commentId', getRepliesByComment);

export default router;
