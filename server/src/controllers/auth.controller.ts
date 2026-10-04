import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { UnauthorizedError, NotFoundError } from '../utils/errors';
import { AuthRequest } from '../middleware/auth.middleware';
import { createMfaSecret, decryptMfaSecret, encryptMfaSecret, verifyTotp } from '../utils/mfa';

const signToken = (userId: string, companyId: string | null, tokenVersion: number): string => {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
  return jwt.sign({ userId, companyId, tokenVersion }, secret, { expiresIn } as any);
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, otp } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true, role: { include: { rolePermissions: { include: { permission: true } } } } },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status !== 'ACTIVE' || (user.company && user.company.status !== 'ACTIVE')) {
      throw new UnauthorizedError('Your account has been deactivated');
    }
    const isSuperAdmin = user.role.name === 'SUPERADMIN';
    const validScope = (isSuperAdmin && user.scope === 'GLOBAL' && !user.companyId)
      || (!isSuperAdmin && user.scope === 'COMPANY' && !!user.companyId);
    if (!validScope) {
      throw new UnauthorizedError('Your account has an invalid scope configuration');
    }
    if (user.mfaEnabled) {
      if (!otp || !user.mfaSecret || !verifyTotp(decryptMfaSecret(user.mfaSecret), otp)) throw new UnauthorizedError('MFA code required or invalid');
    }
    if (!isSuperAdmin && !user.companyId) {
      throw new UnauthorizedError('Your account is not assigned to a company');
    }

    // Update last login
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    // Audit log
    await prisma.auditLog.create({
      data: { userId: user.id, companyId: user.companyId, action: 'LOGIN', entity: 'User', entityId: user.id },
    });

    const token = signToken(user.id, user.companyId, user.tokenVersion);

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
          scope: user.scope,
          mustChangePassword: user.mustChangePassword,
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
      await prisma.user.update({ where: { id: req.user.id }, data: { tokenVersion: { increment: 1 } } });
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
        scope: user.scope,
        mustChangePassword: user.mustChangePassword,
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
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword, mustChangePassword: false, tokenVersion: { increment: 1 } } });
    res.json({ success: true, message: 'Password changed successfully', data: null });
  } catch (error) {
    next(error);
  }
};

export const setupMfa = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.roleName !== 'SUPERADMIN' || req.user.scope !== 'GLOBAL') throw new UnauthorizedError('Super Admin MFA is required for this operation');
    const secret = createMfaSecret();
    await prisma.user.update({ where: { id: req.user.id }, data: { mfaSecret: encryptMfaSecret(secret), mfaEnabled: false } });
    const label = encodeURIComponent(req.user.email);
    const issuer = encodeURIComponent('TuaVois');
    res.json({ success: true, message: 'MFA secret created. Verify a code to enable MFA.', data: { secret, otpauthUrl: `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30` } });
  } catch (error) { next(error); }
};

export const verifyMfa = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.roleName !== 'SUPERADMIN' || req.user.scope !== 'GLOBAL') throw new UnauthorizedError('Super Admin MFA is required for this operation');
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { mfaSecret: true } });
    if (!user?.mfaSecret || !verifyTotp(decryptMfaSecret(user.mfaSecret), req.body.code)) throw new UnauthorizedError('Invalid MFA code');
    await prisma.user.update({ where: { id: req.user.id }, data: { mfaEnabled: true } });
    res.json({ success: true, message: 'MFA enabled successfully', data: { enabled: true } });
  } catch (error) { next(error); }
};
