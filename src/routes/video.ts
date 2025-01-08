// @ts-nocheck
import { Router } from 'express';
import {
  uploadVideo,
  handleUpload,
  updateVideo,
  deleteVideo,
  getAllVideos,
  getVideo,
  getVideosByUserID,
  getVideosByTag,
  searchVideos,
  likeVideo,
  dislikeVideo,
} from '../controllers/video';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/upload', authenticate, uploadVideo, handleUpload);
router.put('/:id', authenticate, updateVideo);
router.delete('/:id', authenticate, deleteVideo);
router.get('/', getAllVideos);
router.get('/user/:id', getVideosByUserID);
router.get('/search', searchVideos);
router.get('/:id', getVideo);
router.get('/tag/:tag', getVideosByTag);
router.post('/like/:id', likeVideo);
router.post('/dislike/:id', dislikeVideo);

export default router;
