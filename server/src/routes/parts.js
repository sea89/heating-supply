import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/partsController.js';

const router = Router();
router.get('/', authenticate, ctrl.list);
router.get('/next-code', authenticate, ctrl.getNextCode);
router.get('/categories', authenticate, ctrl.listCategories);
router.post('/categories', authenticate, ctrl.createCategory);
router.put('/categories/:id', authenticate, ctrl.updateCategory);
router.delete('/categories/:id', authenticate, ctrl.deleteCategory);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, ctrl.create);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);

export default router;
