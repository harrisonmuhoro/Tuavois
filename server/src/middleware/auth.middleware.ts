import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

export interface AuthRequest extends Request {
  params: Record<string, string>;
  /** Trusted tenant context populated by authenticate from the database user. */
  companyId?: string;
  user?: {
    id: string;
    email: string;
    roleId: string;
    roleName: string;
    department?: string | null;
    companyId: string;
    permissions: string[];
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new UnauthorizedError('Server configuration error');

    const decoded = jwt.verify(token, secret) as { userId: string; companyId?: string | null };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
      },
    });

    if (!user) throw new UnauthorizedError('User not found');
    if (user.status !== 'ACTIVE') throw new UnauthorizedError('Account is inactive');
    if (!user.companyId) throw new UnauthorizedError('User is not assigned to a company');
    if (decoded.companyId && decoded.companyId !== user.companyId) {
      throw new UnauthorizedError('Tenant context is no longer valid');
    }

    req.companyId = user.companyId;
    req.user = {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
      department: user.department,
      companyId: user.companyId,
      permissions: user.role.rolePermissions.map((p) => p.permission.name),
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(error);
    }
  }
};

export const authorize = (...permissionNames: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    // Admin has all permissions
    if (req.user.roleName === 'ADMIN') {
      next();
      return;
    }

    const hasPermission = permissionNames.some((perm) =>
      req.user!.permissions.includes(perm)
    );

    if (!hasPermission) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };
};
