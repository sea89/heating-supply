import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as ctrl from '../controllers/purchasesController.js';

const router = Router();

router.get('/', authenticate, ctrl.list);
router.post('/', authenticate, validate({ items: { required: true, type: 'array', message: '请添加采购项' } }), ctrl.create);
router.get('/:id', authenticate, ctrl.getById);
router.put('/:id', authenticate, ctrl.update);
router.put('/:id/items/:itemId', authenticate, validate({ quantity: { required: true, type: 'number', min: 0.01, message: '请输入有效数量' } }), ctrl.updateItem);
router.post('/:id/arrival', authenticate, validate({ items: { required: true, type: 'array', message: '请添加入库项' } }), ctrl.arrival);

export default router;
