import { Router } from 'express';
import * as prospectsController from '../controllers/prospects.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate, prospectSchema } from '../validators';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('prospects.view'), prospectsController.getProspects);
router.post('/', authorize('prospects.create'), validate(prospectSchema), auditLog('PROSPECT_CREATED', 'Prospect'), prospectsController.createProspect);
router.put('/:id', authorize('prospects.edit'), validate(prospectSchema), auditLog('PROSPECT_UPDATED', 'Prospect'), prospectsController.updateProspect);
router.post('/:id/convert', authorize('clients.create'), auditLog('PROSPECT_CONVERTED', 'Prospect'), prospectsController.convertProspectToClient);

export default router;
