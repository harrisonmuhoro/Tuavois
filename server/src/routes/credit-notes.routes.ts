import { Router } from 'express';
import * as controller from '../controllers/credit-notes.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { creditNoteApplicationSchema, creditNoteSchema, validate } from '../validators';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();
router.use(authenticate, authorize('invoices.view'));
router.get('/', controller.getCreditNotes);
router.post('/', authorize('invoices.edit'), validate(creditNoteSchema), auditLog('CREDIT_NOTE_CREATED', 'CreditNote'), controller.createCreditNote);
router.post('/:id/apply', authorize('invoices.edit'), validate(creditNoteApplicationSchema), auditLog('CREDIT_NOTE_APPLIED', 'CreditNote'), controller.applyCreditNote);
router.post('/:id/void', authorize('invoices.edit'), auditLog('CREDIT_NOTE_VOIDED', 'CreditNote'), controller.voidCreditNote);

export default router;
