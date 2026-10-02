import { Router } from 'express';
import { provisionCompany } from '../controllers/companies.controller';
import { companyProvisionSchema, validate } from '../validators';

const router = Router();
router.post('/', validate(companyProvisionSchema), provisionCompany);

export default router;
