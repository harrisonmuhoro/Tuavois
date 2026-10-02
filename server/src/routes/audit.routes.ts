import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate, authorize('reports.view'));
router.get('/', getAuditLogs);
export default router;
