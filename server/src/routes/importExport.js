import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
import * as ctrl from '../controllers/importExportController.js';

const router = Router();
router.get('/template', authenticate, ctrl.downloadTemplate);
router.get('/download', authenticate, ctrl.downloadExport);
router.post('/upload', authenticate, upload.single('file'), ctrl.uploadImport);

export default router;
