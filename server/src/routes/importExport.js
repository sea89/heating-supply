import { Router } from 'express';
import multer from 'multer';
import { authenticate , requireAccess } from '../middleware/auth.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
import * as ctrl from '../controllers/importExportController.js';

const router = Router();
router.get('/template', authenticate, requireAccess(["admin","warehouse"], ["admin","warehouse"]), ctrl.downloadTemplate);
router.get('/download', authenticate, requireAccess(["admin","warehouse"], ["admin","warehouse"]), ctrl.downloadExport);
router.post('/upload', authenticate, requireAccess(["admin","warehouse"], ["admin","warehouse"]), upload.single('file'), ctrl.uploadImport);

export default router;
