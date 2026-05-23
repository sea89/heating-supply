import { Router } from 'express';
import { authenticate , requireAccess } from '../middleware/auth.js';
import * as ctrl from '../controllers/personnelController.js';

const router = Router();
router.get('/', authenticate, requireAccess(["admin"], ["admin"]), ctrl.list);
router.get('/:id', authenticate, requireAccess(["admin"], ["admin"]), ctrl.getById);
router.post('/', authenticate, requireAccess(["admin"], ["admin"]), ctrl.create);
router.put('/:id', authenticate, requireAccess(["admin"], ["admin"]), ctrl.update);
router.delete('/:id', authenticate, requireAccess(["admin"], ["admin"]), ctrl.remove);

export default router;
