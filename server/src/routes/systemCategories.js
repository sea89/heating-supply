import { Router } from 'express';
import { authenticate , requireAccess } from '../middleware/auth.js';
import * as ctrl from '../controllers/systemCategoriesController.js';

const router = Router();
router.get('/', authenticate, requireAccess(["admin","warehouse","maintenance"], ["admin","warehouse"]), ctrl.list);
router.get('/tree', authenticate, requireAccess(["admin","warehouse","maintenance"], ["admin","warehouse"]), ctrl.tree);
router.post('/', authenticate, requireAccess(["admin","warehouse","maintenance"], ["admin","warehouse"]), ctrl.create);
router.put('/:id', authenticate, requireAccess(["admin","warehouse","maintenance"], ["admin","warehouse"]), ctrl.update);
router.delete('/:id', authenticate, requireAccess(["admin","warehouse","maintenance"], ["admin","warehouse"]), ctrl.remove);

export default router;
