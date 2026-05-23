import { Router } from 'express';
import { authenticate , requireAccess } from '../middleware/auth.js';
import * as ctrl from '../controllers/equipmentController.js';

const router = Router();
router.get('/', authenticate, requireAccess(["admin","warehouse","maintenance"], ["admin","warehouse"]), ctrl.list);
router.get('/next-code', authenticate, requireAccess(["admin","warehouse","maintenance"], ["admin","warehouse"]), ctrl.getNextCode);
router.get('/:id', authenticate, requireAccess(["admin","warehouse","maintenance"], ["admin","warehouse"]), ctrl.getById);
router.post('/', authenticate, requireAccess(["admin","warehouse","maintenance"], ["admin","warehouse"]), ctrl.create);
router.put('/:id', authenticate, requireAccess(["admin","warehouse","maintenance"], ["admin","warehouse"]), ctrl.update);
router.delete('/:id', authenticate, requireAccess(["admin","warehouse","maintenance"], ["admin","warehouse"]), ctrl.remove);

export default router;
