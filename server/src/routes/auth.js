import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { login, getMe, createUser, listUsers, changePassword, updateUser } from '../controllers/authController.js';

const router = Router();
router.post('/login', validate({ username: { required: true, type: 'string', message: '请输入用户名' }, password: { required: true, type: 'string', message: '请输入密码' } }), login);
router.get('/me', authenticate, getMe);
router.post('/register', authenticate, requireRole('admin'), validate({ username: { required: true, type: 'string', minLength: 2 }, password: { required: true, type: 'string', minLength: 6 }, name: { required: true, type: 'string' }, role: { required: true, type: 'string' } }), createUser);
router.get('/users', authenticate, listUsers);
router.put('/change-password', authenticate, changePassword);
router.put('/users/:id', authenticate, requireRole('admin'), updateUser);

export default router;
