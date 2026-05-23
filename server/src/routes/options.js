import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getAllOptions } from '../controllers/optionsController.js';

const router = Router();
router.get('/', authenticate, getAllOptions);

export default router;