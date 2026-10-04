import { Router } from 'express';
import { authenticate, authorizeSystem, requireStepUp } from '../middleware/auth.middleware';
import { createCompany, getCompany, getGlobalReport, listCompanies, listGlobalAuditLogs, listUsers, suspendCompany, suspendUser, updateCompany, updateUser } from '../controllers/system.controller';
import { companyProvisionSchema, systemCompanyUpdateSchema, systemUserSuspendSchema, systemUserUpdateSchema, validate } from '../validators';

const router = Router();
router.use(authenticate);
router.get('/companies', authorizeSystem('companies.view'), listCompanies);
router.post('/companies', authorizeSystem('companies.create'), requireStepUp, validate(companyProvisionSchema), createCompany);
router.get('/companies/:companyId', authorizeSystem('companies.view'), getCompany);
router.patch('/companies/:companyId', authorizeSystem('companies.edit'), requireStepUp, validate(systemCompanyUpdateSchema), updateCompany);
router.post('/companies/:companyId/suspend', authorizeSystem('companies.suspend'), requireStepUp, suspendCompany);
router.get('/users', authorizeSystem('users.view.global'), listUsers);
router.patch('/users/:userId', authorizeSystem('users.manage.global'), requireStepUp, validate(systemUserUpdateSchema), updateUser);
router.post('/users/:userId/suspend', authorizeSystem('users.manage.global'), requireStepUp, validate(systemUserSuspendSchema), suspendUser);
router.get('/reports', authorizeSystem('reports.view.global'), getGlobalReport);
router.get('/audit-logs', authorizeSystem('audit.view.global'), listGlobalAuditLogs);

export default router;
