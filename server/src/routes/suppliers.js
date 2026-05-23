import { Router } from 'express';
import { authenticate , requireAccess } from '../middleware/auth.js';
import * as ctrl from '../controllers/suppliersController.js';

const router = Router();
router.get('/', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse","procurement"]), ctrl.list);
router.get('/:id', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse","procurement"]), ctrl.getById);
router.post('/', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse","procurement"]), ctrl.create);
router.put('/:id', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse","procurement"]), ctrl.update);
router.delete('/:id', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse","procurement"]), ctrl.remove);

export default router;
