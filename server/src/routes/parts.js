import { Router } from 'express';
import { authenticate , requireAccess } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as ctrl from '../controllers/partsController.js';

const router = Router();
router.get('/', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse"]), ctrl.list);
router.get('/next-code', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse"]), ctrl.getNextCode);
router.get('/categories', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse"]), ctrl.listCategories);
router.post('/categories', authenticate, requireAccess(["admin","warehouse"], ["admin","warehouse"]), ctrl.createCategory);
router.put('/categories/:id', authenticate, requireAccess(["admin","warehouse"], ["admin","warehouse"]), ctrl.updateCategory);
router.delete('/categories/:id', authenticate, requireAccess(["admin","warehouse"], ["admin","warehouse"]), ctrl.deleteCategory);
router.get('/:id', authenticate, requireAccess(["admin","warehouse","procurement"], ["admin","warehouse"]), ctrl.getById);
router.post('/', authenticate, requireAccess(["admin","warehouse"], ["admin","warehouse"]), validate({ code: { required: true, type: 'string' }, name: { required: true, type: 'string' }, unit: { required: true, type: 'string' } }), ctrl.create);
router.put('/:id', authenticate, requireAccess(["admin","warehouse"], ["admin","warehouse"]), validate({ name: { required: false, type: 'string' }, unit: { required: false, type: 'string' } }), ctrl.update);
router.delete('/:id', authenticate, requireAccess(["admin","warehouse"], ["admin","warehouse"]), ctrl.remove);

export default router;
