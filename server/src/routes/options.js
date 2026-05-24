import { Router } from 'express';
import { authenticate , requireAccess } from '../middleware/auth.js';
import { getAllOptions , cleanupCorrupted } from '../controllers/optionsController.js';

const router = Router();
router.delete('/corrupted', authenticate, requireAccess(["admin"], ["admin"]), cleanupCorrupted);

router.get('/', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse","maintenance","procurement"]), getAllOptions);

export default router;