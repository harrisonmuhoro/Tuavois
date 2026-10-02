import { Router } from 'express';
import * as paymentsController from '../controllers/payments.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate, paymentSchema } from '../validators';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();
router.use(authenticate);

router.get('/', authorize('payments.view'), paymentsController.getPayments);
router.post('/', authorize('payments.create'), validate(paymentSchema), auditLog('PAYMENT_CREATED', 'Payment'), paymentsController.createPayment);

export default router;
