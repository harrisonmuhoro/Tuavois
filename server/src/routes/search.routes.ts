import { Router } from 'express';
import { globalSearch } from '../controllers/search.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', authorize('search.view'), globalSearch);

export default router;
