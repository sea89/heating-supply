import { Router } from 'express';
import { authenticate , requireAccess } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as ctrl from '../controllers/purchasesController.js';

const router = Router();

router.get('/', authenticate, requireAccess(["admin","warehouse","procurement"], ["admin","warehouse","procurement"]), ctrl.list);
router.post('/', authenticate, requireAccess(["admin","warehouse","procurement"], ["admin","warehouse","procurement"]), validate({ items: { required: true, type: 'array', message: '请添加采购项' } }), ctrl.create);
router.get('/:id', authenticate, requireAccess(["admin","warehouse","procurement"], ["admin","warehouse","procurement"]), ctrl.getById);
router.put('/:id', authenticate, requireAccess(["admin","warehouse","procurement"], ["admin","warehouse","procurement"]), ctrl.update);
router.put('/:id/items/:itemId', authenticate, requireAccess(["admin","warehouse","procurement"], ["admin","warehouse","procurement"]), validate({ quantity: { required: true, type: 'number', min: 0.01, message: '请输入有效数量' } }), ctrl.updateItem);
router.post('/:id/arrival', authenticate, requireAccess(["admin","warehouse","procurement"], ["admin","warehouse","procurement"]), validate({ items: { required: true, type: 'array', message: '请添加入库项' } }), ctrl.arrival);

export default router;

router.delete('/:id', authenticate, requireAccess(["admin","warehouse","procurement"], ["admin","warehouse","procurement"]), ctrl.remove);
