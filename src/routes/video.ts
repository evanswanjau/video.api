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
  unlikeVideo,
  undislikeVideo,
  addToWatchHistory,
  getWatchHistory,
  saveVideo,
  removeSavedVideo,
  getSavedVideos,
  getMyVideos,
} from '../controllers/video';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/upload', authenticate, uploadVideo, handleUpload);
router.put('/:id', authenticate, updateVideo);
router.delete('/:id', authenticate, deleteVideo);
router.get('/', getAllVideos);
router.get('/search', searchVideos);
router.get('/:id', getVideo);
router.get('/tag/:tag', getVideosByTag);
router.post('/like/:id', likeVideo);
router.post('/dislike/:id', dislikeVideo);
router.post('/unlike/:id', unlikeVideo);
router.post('/undislike/:id', undislikeVideo);
router.post('/user/watch-history', authenticate, addToWatchHistory);
router.get('/user/watch-history', authenticate, getWatchHistory);
router.post('/user/save-video', authenticate, saveVideo);
router.delete('/user/save-video', authenticate, removeSavedVideo);
router.get('/user/save-video', authenticate, getSavedVideos);
router.get('/user/my-videos', authenticate, getMyVideos);
router.get('/user/:id', getVideosByUserID);

export default router;
