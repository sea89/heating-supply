import { Router } from 'express';
import { authenticate , requireAccess } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as ctrl from '../controllers/inventoryController.js';

const router = Router();

router.get('/overview', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse"]), ctrl.overview);
router.get('/stock', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse"]), ctrl.stock);
router.get('/transactions', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse"]), ctrl.transactions);
router.post('/inbound', authenticate, requireAccess(["admin","warehouse"], ["admin","warehouse"]), validate({ items: { required: true, type: 'array', message: '请添加入库项' } }), ctrl.inbound);
router.post('/outbound', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse","maintenance","procurement"]), validate({ items: { required: true, type: 'array', message: '请添加出库项' } }), ctrl.outbound);
router.put('/stock', authenticate, requireAccess(["admin","warehouse"], ["admin","warehouse"]), ctrl.adjustStock);
router.delete('/stock/:id', authenticate, requireAccess(["admin","warehouse"], ["admin","warehouse"]), ctrl.deleteStock);

export default router;
