import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/workOrdersController.js';

const router = Router();

router.get('/', authenticate, ctrl.list);
router.post('/', authenticate, ctrl.create);
router.get('/:id', authenticate, ctrl.getById);
router.put('/:id', authenticate, ctrl.update);
router.post('/:id/complete', authenticate, ctrl.complete);
router.get('/:id/stock-check', authenticate, ctrl.stockCheck);

export default router;
