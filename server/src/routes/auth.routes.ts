import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate, loginSchema, changePasswordSchema } from '../validators';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.put('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

export default router;
