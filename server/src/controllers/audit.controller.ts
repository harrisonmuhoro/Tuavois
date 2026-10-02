import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { paginationMeta, parsePagination } from '../utils/pagination';
import { tenantScope } from '../utils/tenant';

export const getAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>, { limit: 30 });
    const { search = '' } = req.query as Record<string, string>;
    const where: any = { ...tenantScope(req), ...(search ? { OR: [{ action: { contains: search } }, { entity: { contains: search } }, { entityId: { contains: search } }] } : {}) };
    const [logs, total] = await Promise.all([prisma.auditLog.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true, email: true } } } }), prisma.auditLog.count({ where })]);
    res.json({ success: true, data: logs, pagination: paginationMeta({ page, limit, skip }, total) });
  } catch (error) { next(error); }
};
