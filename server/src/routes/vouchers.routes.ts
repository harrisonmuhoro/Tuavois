import { Router } from 'express';
import * as vouchersController from '../controllers/vouchers.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate, voucherSchema, voucherStatusSchema } from '../validators';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();
router.use(authenticate);

router.get('/operations', authorize('reports.view'), vouchersController.getVoucherOperations);
router.get('/', authorize('trips.view'), vouchersController.getVouchers);
router.post('/', authorize('trips.edit'), validate(voucherSchema), auditLog('VOUCHER_CREATED', 'Voucher'), vouchersController.createVoucher);
router.get('/:id', authorize('trips.view'), vouchersController.getVoucherById);
router.patch('/:id/status', authorize('trips.edit'), validate(voucherStatusSchema), auditLog('VOUCHER_STATUS_UPDATED', 'Voucher'), vouchersController.updateVoucherStatus);
router.patch('/:id/operations', authorize('trips.edit'), auditLog('VOUCHER_OPERATION_COMPLETED', 'Voucher'), vouchersController.completeVoucherOperation);

export default router;
