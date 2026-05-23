import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/toolsController.js';

const router = Router();
router.get('/', authenticate, ctrl.list);
router.post('/borrow', authenticate, ctrl.borrow);
router.get('/borrows', authenticate, ctrl.listBorrows);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, ctrl.create);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);
router.post('/:id/return', authenticate, ctrl.returnTool);

export default router;
