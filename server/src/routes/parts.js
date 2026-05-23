import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as ctrl from '../controllers/partsController.js';

const router = Router();
router.get('/', authenticate, ctrl.list);
router.get('/next-code', authenticate, ctrl.getNextCode);
router.get('/categories', authenticate, ctrl.listCategories);
router.post('/categories', authenticate, ctrl.createCategory);
router.put('/categories/:id', authenticate, ctrl.updateCategory);
router.delete('/categories/:id', authenticate, ctrl.deleteCategory);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, validate({ code: { required: true, type: 'string' }, name: { required: true, type: 'string' }, unit: { required: true, type: 'string' } }), ctrl.create);
router.put('/:id', authenticate, validate({ name: { required: false, type: 'string' }, unit: { required: false, type: 'string' } }), ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);

export default router;
