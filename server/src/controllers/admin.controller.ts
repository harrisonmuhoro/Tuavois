import bcrypt from 'bcryptjs';
import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { ConflictError, NotFoundError } from '../utils/errors';
import { paginationMeta, parsePagination } from '../utils/pagination';
import { tenantScope } from '../utils/tenant';

export const getStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { search = '', status, roleId } = req.query as Record<string, string>;
    const where: any = { ...tenantScope(req) };
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
    const existing = await prisma.user.findFirst({ where: { email, ...tenantScope(req) } });
    if (existing) throw new ConflictError('A staff account with this email already exists');
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundError('Role');
    const user = await prisma.user.create({ data: { name, email, password: await bcrypt.hash(password, 12), phone, department, roleId, companyId: req.companyId }, select: { id: true, name: true, email: true, phone: true, department: true, status: true, dateJoined: true, role: { select: { id: true, name: true } } } });
    res.status(201).json({ success: true, message: 'Staff account created successfully', data: user });
  } catch (error) { next(error); }
};

export const getRoles = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { res.json({ success: true, data: await prisma.role.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, description: true } }) }); } catch (error) { next(error); }
};

export const getCompanySettings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.companyId) throw new NotFoundError('Company');
    res.json({ success: true, data: await prisma.company.findUnique({ where: { id: req.user.companyId } }) });
  } catch (error) { next(error); }
};

export const updateCompanySettings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.companyId) throw new NotFoundError('Company');
    const settings = await prisma.company.update({ where: { id: req.user.companyId }, data: req.body });
    res.json({ success: true, message: 'Company settings updated successfully', data: settings });
  } catch (error) { next(error); }
};
