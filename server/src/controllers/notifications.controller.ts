import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { paginationMeta, parsePagination } from '../utils/pagination';

export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>, { limit: 20 });
    const where = { userId: req.user!.id };
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.notification.count({ where }),
    ]);
    res.json({ success: true, data: notifications, pagination: paginationMeta({ page, limit, skip }, total) });
  } catch (error) { next(error); }
};

export const markRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notification = await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user!.id }, data: { read: true } });
    res.json({ success: true, data: notification });
  } catch (error) { next(error); }
};

export const markAllRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notifications = await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } });
    res.json({ success: true, data: notifications });
  } catch (error) { next(error); }
};
