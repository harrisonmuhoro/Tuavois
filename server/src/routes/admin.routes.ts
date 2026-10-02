import { Router } from 'express';
import { createStaff, getCompanySettings, getRoles, getStaff, updateCompanySettings } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { companySettingsSchema, staffSchema, validate } from '../validators';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();
router.use(authenticate);
router.get('/staff', authorize('staff.manage'), getStaff);
router.post('/staff', authorize('staff.manage'), validate(staffSchema), auditLog('STAFF_CREATED', 'User'), createStaff);
router.get('/roles', authorize('staff.manage'), getRoles);
router.get('/settings/company', authorize('settings.manage'), getCompanySettings);
router.put('/settings/company', authorize('settings.manage'), validate(companySettingsSchema), auditLog('COMPANY_SETTINGS_UPDATED', 'CompanySettings'), updateCompanySettings);
export default router;
