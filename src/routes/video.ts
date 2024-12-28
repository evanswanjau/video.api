// @ts-nocheck
import { Router } from 'express';
import {
  uploadVideo,
  handleUpload,
  updateVideo,
  deleteVideo,
  getAllVideos,
  getVideo,
} from '../controllers/video';

const router = Router();

router.post('/upload', uploadVideo, handleUpload);
router.put('/:id', updateVideo);
router.delete('/:id', deleteVideo);
router.get('/', getAllVideos);
router.get('/:id', getVideo);

export default router;
