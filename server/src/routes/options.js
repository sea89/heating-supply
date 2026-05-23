import { Router } from 'express';
import { authenticate , requireAccess } from '../middleware/auth.js';
import { getAllOptions } from '../controllers/optionsController.js';

const router = Router();
router.get('/', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse","maintenance","procurement"]), getAllOptions);

export default router;