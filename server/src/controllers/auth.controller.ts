import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { UnauthorizedError, NotFoundError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth.middleware';

const signToken = (userId: string, companyId: string): string => {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ userId, companyId }, secret, { expiresIn } as any);
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true, role: { include: { rolePermissions: { include: { permission: true } } } } },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Your account has been deactivated');
    }
    if (!user.companyId) {
      throw new UnauthorizedError('Your account is not assigned to a company');
    }

    // Update last login
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    // Audit log
    await prisma.auditLog.create({
      data: { userId: user.id, companyId: user.companyId, action: 'LOGIN', entity: 'User', entityId: user.id },
    });

    const token = signToken(user.id, user.companyId);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name,
          department: user.department,
          companyId: user.companyId,
          company: user.company,
          permissions: user.role.rolePermissions.map((p) => p.permission.name),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user) {
      await prisma.auditLog.create({
        data: { userId: req.user.id, companyId: req.companyId, action: 'LOGOUT', entity: 'User', entityId: req.user.id },
      });
    }
    res.json({ success: true, message: 'Logged out successfully', data: null });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { company: true, role: { include: { rolePermissions: { include: { permission: true } } } } },
      omit: { password: true },
    });

    if (!user) throw new NotFoundError('User');

    res.json({
      success: true,
      data: {
        ...user,
        companyId: user.companyId,
        permissions: user.role.rolePermissions.map((p) => p.permission.name),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new NotFoundError('User');
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new UnauthorizedError('Current password is incorrect');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
    res.json({ success: true, message: 'Password changed successfully', data: null });
  } catch (error) {
    next(error);
  }
};
