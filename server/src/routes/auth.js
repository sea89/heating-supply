import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { login, getMe, createUser, listUsers, changePassword, updateUser } from '../controllers/authController.js';

const router = Router();
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.post('/register', authenticate, requireRole('admin'), createUser);
router.get('/users', authenticate, listUsers);
router.put('/change-password', authenticate, changePassword);
router.put('/users/:id', authenticate, requireRole('admin'), updateUser);

export default router;
