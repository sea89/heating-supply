import { Router } from 'express';
import { authenticate , requireAccess } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as ctrl from '../controllers/toolsController.js';

const router = Router();
router.get('/', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse"]), ctrl.list);
router.post('/borrow', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse"]), ctrl.borrow);
router.get('/borrows', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse"]), ctrl.listBorrows);
router.get('/:id', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse"]), ctrl.getById);
router.post('/', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse"]), validate({ code: { required: true, type: 'string' }, name: { required: true, type: 'string' } }), ctrl.create);
router.put('/:id', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse"]), ctrl.update);
router.delete('/:id', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse"]), ctrl.remove);
router.post('/:id/return', authenticate, requireAccess(["admin","warehouse","maintenance","procurement"], ["admin","warehouse"]), ctrl.returnTool);

export default router;
