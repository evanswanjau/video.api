// @ts-nocheck
import { Router } from 'express';
import {
  createTag,
  getTags,
  getTagById,
  updateTag,
  deleteTag,
  addTagsInBulk,
  searchTags,
} from '../controllers/tag';

const router = Router();

router.post('/', createTag);
router.get('/search', searchTags);
router.get('/', getTags);
router.get('/:id', getTagById);
router.put('/:id', updateTag);

router.delete('/:id', deleteTag);
router.post('/bulk', addTagsInBulk);

export default router;
