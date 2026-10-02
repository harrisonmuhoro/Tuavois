import bcrypt from 'bcryptjs';
import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { ConflictError, NotFoundError } from '../utils/errors';
import { paginationMeta, parsePagination } from '../utils/pagination';

export const getStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { search = '', status, roleId } = req.query as Record<string, string>;
    const where: any = {};
    if (search) where.OR = [{ name: { contains: search } }, { email: { contains: search } }, { department: { contains: search } }];
    if (status) where.status = status;
    if (roleId) where.roleId = roleId;
    const [staff, total] = await Promise.all([
      prisma.user.findMany({ where, skip, take: limit, orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, phone: true, department: true, status: true, dateJoined: true, role: { select: { id: true, name: true } } } }),
      prisma.user.count({ where }),
    ]);
    res.json({ success: true, data: staff, pagination: paginationMeta({ page, limit, skip }, total) });
  } catch (error) { next(error); }
};

export const createStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, phone, department, roleId } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictError('A staff account with this email already exists');
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundError('Role');
    const user = await prisma.user.create({ data: { name, email, password: await bcrypt.hash(password, 12), phone, department, roleId }, select: { id: true, name: true, email: true, phone: true, department: true, status: true, dateJoined: true, role: { select: { id: true, name: true } } } });
    res.status(201).json({ success: true, message: 'Staff account created successfully', data: user });
  } catch (error) { next(error); }
};

export const getRoles = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { res.json({ success: true, data: await prisma.role.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, description: true } }) }); } catch (error) { next(error); }
};

export const getCompanySettings = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { res.json({ success: true, data: await prisma.companySettings.findUnique({ where: { id: 'company-settings-1' } }) }); } catch (error) { next(error); }
};

export const updateCompanySettings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { const settings = await prisma.companySettings.upsert({ where: { id: 'company-settings-1' }, update: req.body, create: { id: 'company-settings-1', ...req.body } }); res.json({ success: true, message: 'Company settings updated successfully', data: settings }); } catch (error) { next(error); }
};
