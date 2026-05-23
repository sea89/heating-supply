import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as ctrl from '../controllers/workOrdersController.js';

const router = Router();

router.get('/', authenticate, ctrl.list);
router.post('/', authenticate, validate({ fault_description: { required: true, type: 'string', message: '请填写故障描述' } }), ctrl.create);
router.get('/:id', authenticate, ctrl.getById);
router.put('/:id', authenticate, ctrl.update);
router.post('/:id/complete', authenticate, ctrl.complete);
router.get('/:id/stock-check', authenticate, ctrl.stockCheck);

export default router;

router.delete('/:id', authenticate, ctrl.remove);
