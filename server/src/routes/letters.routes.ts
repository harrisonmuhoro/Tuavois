import { Router } from 'express';
import * as controller from '../controllers/letters.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { letterSchema, validate } from '../validators';

const router = Router();
router.use(authenticate);
router.get('/', authorize('letters.view'), controller.getLetters);
router.post('/', authorize('letters.create'), validate(letterSchema), auditLog('LETTER_CREATED', 'Letter'), controller.createLetter);
router.get('/:id', authorize('letters.view'), controller.getLetterById);
router.put('/:id', authorize('letters.edit'), validate(letterSchema), auditLog('LETTER_UPDATED', 'Letter'), controller.updateLetter);
router.delete('/:id', authorize('letters.delete'), auditLog('LETTER_DELETED', 'Letter'), controller.deleteLetter);
export default router;
