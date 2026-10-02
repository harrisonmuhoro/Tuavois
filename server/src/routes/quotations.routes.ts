import { Router } from 'express';
import * as quotationsController from '../controllers/quotations.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate, quotationSchema } from '../validators';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('quotations.view'), quotationsController.getQuotations);
router.post('/', authorize('quotations.create'), validate(quotationSchema), auditLog('QUOTATION_CREATED', 'Quotation'), quotationsController.createQuotation);
router.get('/:id', authorize('quotations.view'), quotationsController.getQuotationById);
router.put('/:id', authorize('quotations.edit'), validate(quotationSchema), auditLog('QUOTATION_UPDATED', 'Quotation'), quotationsController.updateQuotation);
router.post('/:id/convert-to-invoice', authorize('invoices.create'), auditLog('QUOTATION_CONVERTED', 'Quotation'), quotationsController.convertQuotationToInvoice);
router.post('/:id/duplicate', authorize('quotations.create'), auditLog('QUOTATION_DUPLICATED', 'Quotation'), quotationsController.duplicateQuotation);

export default router;
