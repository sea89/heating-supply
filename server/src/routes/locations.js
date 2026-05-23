import { Router } from 'express';
import { authenticate , requireAccess } from '../middleware/auth.js';
import * as ctrl from '../controllers/locationsController.js';

const router = Router();
router.get('/', authenticate, requireAccess(["admin","warehouse"], ["admin","warehouse"]), ctrl.list);
router.get('/tree', authenticate, requireAccess(["admin","warehouse"], ["admin","warehouse"]), ctrl.tree);
router.post('/transfer', authenticate, requireAccess(["admin","warehouse"], ["admin","warehouse"]), ctrl.transfer);
router.get('/:id', authenticate, requireAccess(["admin","warehouse"], ["admin","warehouse"]), ctrl.getById);
router.post('/', authenticate, requireAccess(["admin","warehouse"], ["admin","warehouse"]), ctrl.create);
router.put('/:id', authenticate, requireAccess(["admin","warehouse"], ["admin","warehouse"]), ctrl.update);
router.delete('/:id', authenticate, requireAccess(["admin","warehouse"], ["admin","warehouse"]), ctrl.remove);

export default router;
