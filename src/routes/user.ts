// @ts-nocheck
import { Router } from 'express';
import {
  signUp,
  signIn,
  changePassword,
  forgotPassword,
  resetPassword,
  updateUser,
  deleteUser,
  myAccount,
  searchUsers,
  viewByID,
} from '../controllers/user';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/signup', signUp);
router.post('/signin', signIn);
router.post('/change-password', authenticate, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', authenticate, resetPassword);
router.put('/', authenticate, updateUser);
router.delete('/', authenticate, deleteUser);
router.get('/my-account', authenticate, myAccount);
router.get('/:id', authenticate, viewByID);
router.get('/search', authenticate, searchUsers);

export default router;
