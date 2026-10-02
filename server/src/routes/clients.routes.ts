import { Router } from 'express';
import * as clientsController from '../controllers/clients.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate, clientSchema } from '../validators';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('clients.view'), clientsController.getClients);
router.post('/', authorize('clients.create'), validate(clientSchema), auditLog('CLIENT_CREATED', 'Client'), clientsController.createClient);
router.get('/:id', authorize('clients.view'), clientsController.getClientById);
router.get('/:id/activity', authorize('clients.view', 'reports.view'), clientsController.getClientActivity);
router.put('/:id', authorize('clients.edit'), validate(clientSchema), auditLog('CLIENT_UPDATED', 'Client'), clientsController.updateClient);
router.delete('/:id', authorize('clients.delete'), auditLog('CLIENT_DELETED', 'Client'), clientsController.deleteClient);

export default router;
