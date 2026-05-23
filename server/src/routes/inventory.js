import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as ctrl from '../controllers/inventoryController.js';

const router = Router();

router.get('/overview', authenticate, ctrl.overview);
router.get('/stock', authenticate, ctrl.stock);
router.get('/transactions', authenticate, ctrl.transactions);
router.post('/inbound', authenticate, validate({ items: { required: true, type: 'array', message: '请添加入库项' } }), ctrl.inbound);
router.post('/outbound', authenticate, validate({ items: { required: true, type: 'array', message: '请添加出库项' } }), ctrl.outbound);
router.put('/stock', authenticate, ctrl.adjustStock);

export default router;
