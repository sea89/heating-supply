import { Router } from 'express';
import { authenticate , requireAccess } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as ctrl from '../controllers/workOrdersController.js';

const router = Router();

router.get('/', authenticate, requireAccess(["admin","warehouse","maintenance"], ["admin","warehouse","maintenance"]), ctrl.list);
router.post('/', authenticate, requireAccess(["admin","warehouse","maintenance"], ["admin","warehouse","maintenance"]), validate({ fault_description: { required: true, type: 'string', message: '请填写故障描述' } }), ctrl.create);
router.get('/:id', authenticate, requireAccess(["admin","warehouse","maintenance"], ["admin","warehouse","maintenance"]), ctrl.getById);
router.put('/:id', authenticate, requireAccess(["admin","warehouse","maintenance"], ["admin","warehouse","maintenance"]), ctrl.update);
router.post('/:id/complete', authenticate, requireAccess(["admin","warehouse","maintenance"], ["admin","warehouse","maintenance"]), ctrl.complete);
router.get('/:id/stock-check', authenticate, requireAccess(["admin","warehouse","maintenance"], ["admin","warehouse","maintenance"]), ctrl.stockCheck);

export default router;

router.delete('/:id', authenticate, requireAccess(["admin","warehouse","maintenance"], ["admin","warehouse","maintenance"]), ctrl.remove);
