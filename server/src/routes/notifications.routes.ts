import { Router } from 'express';
import { getNotifications, markAllRead, markRead } from '../controllers/notifications.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.get('/', getNotifications);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);
export default router;
