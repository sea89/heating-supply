import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as ctrl from '../controllers/backupController.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
const router = Router();

router.get('/download', authenticate, requireRole('admin'), ctrl.downloadBackup);
router.post('/restore', authenticate, requireRole('admin'), upload.single('file'), ctrl.restoreBackup);

export default router;

