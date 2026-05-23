import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/inventoryController.js';

const router = Router();

router.get('/overview', authenticate, ctrl.overview);
router.get('/stock', authenticate, ctrl.stock);
router.get('/transactions', authenticate, ctrl.transactions);
router.post('/inbound', authenticate, ctrl.inbound);
router.post('/outbound', authenticate, ctrl.outbound);
router.put('/stock', authenticate, ctrl.adjustStock);

export default router;
