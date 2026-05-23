import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/purchasesController.js';

const router = Router();

router.get('/', authenticate, ctrl.list);
router.post('/', authenticate, ctrl.create);
router.get('/:id', authenticate, ctrl.getById);
router.put('/:id', authenticate, ctrl.update);
router.post('/:id/arrival', authenticate, ctrl.arrival);

export default router;
