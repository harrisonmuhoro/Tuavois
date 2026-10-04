import { Router } from 'express';
import { provisionCompany } from '../controllers/companies.controller';
import { companyProvisionSchema, validate } from '../validators';
import { ForbiddenError } from '../utils/errors';

const router = Router();
router.post('/', (req, _res, next) => {
  const explicitlyEnabled = process.env.ALLOW_PUBLIC_COMPANY_PROVISIONING === 'true';
  if (process.env.NODE_ENV === 'production' && !explicitlyEnabled) {
    next(new ForbiddenError('Public company provisioning is disabled; use the protected system provisioning workflow'));
    return;
  }
  next();
}, validate(companyProvisionSchema), provisionCompany);

export default router;
