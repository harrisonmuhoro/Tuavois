import { Router } from 'express';
import * as invoicesController from '../controllers/invoices.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate, invoiceSchema, statusSchema } from '../validators';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('invoices.view'), invoicesController.getInvoices);
router.post('/', authorize('invoices.create'), validate(invoiceSchema), auditLog('INVOICE_CREATED', 'Invoice'), invoicesController.createInvoice);
router.get('/:id', authorize('invoices.view'), invoicesController.getInvoiceById);
router.put('/:id', authorize('invoices.edit'), validate(invoiceSchema), auditLog('INVOICE_UPDATED', 'Invoice'), invoicesController.updateInvoice);
router.patch('/:id/status', authorize('invoices.edit'), validate(statusSchema), auditLog('INVOICE_STATUS_UPDATED', 'Invoice'), invoicesController.updateInvoiceStatus);

export default router;
