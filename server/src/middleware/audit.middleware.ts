import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from './auth.middleware';

export const auditLog = (action: string, entity: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Store original json method
    const originalJson = res.json.bind(res);

    res.json = function (data: any) {
      if (data?.success && req.user) {
        prisma.auditLog
          .create({
            data: {
              userId: req.user.id,
              companyId: req.companyId,
              action,
              entity,
              entityId: data?.data?.id || req.params.id,
              ipAddress: req.ip,
              userAgent: req.get('user-agent'),
            },
          })
          .catch(console.error);
      }
      return originalJson(data);
    };

    next();
  };
};
