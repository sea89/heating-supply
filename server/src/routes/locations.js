import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/locationsController.js';

const router = Router();
router.get('/', authenticate, ctrl.list);
router.get('/tree', authenticate, ctrl.tree);
router.post('/transfer', authenticate, ctrl.transfer);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, ctrl.create);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);

export default router;
