import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { paginationMeta, parsePagination } from '../utils/pagination';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';

const recordSystemRead = async (req: AuthRequest, action: string, entity: string): Promise<void> => {
  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      companyId: null,
      action,
      entity,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    },
  });
};

const recordSystemEvent = async (req: AuthRequest, action: string, entity: string, entityId: string, targetCompanyId: string | null, changes?: unknown): Promise<void> => {
  await prisma.auditLog.create({
    data: {
      userId: req.user!.id, companyId: targetCompanyId, action, entity, entityId,
      changes: changes as any, ipAddress: req.ip, userAgent: req.get('user-agent'),
    },
  });
};

const targetCompany = async (req: AuthRequest) => {
  const companyId = req.params.companyId;
  if (!companyId) throw new NotFoundError('Company');
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new NotFoundError('Company');
  return company;
};

export const listCompanies = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search || '').trim();
    const where = search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {};
    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true, name: true, email: true, phone: true, currency: true, taxName: true, status: true,
          createdAt: true, updatedAt: true, _count: { select: { users: true, clients: true, invoices: true, trips: true } },
        },
      }),
      prisma.company.count({ where }),
    ]);
    await recordSystemRead(req, 'SUPERADMIN_COMPANY_VIEW', 'Company');
    res.json({ success: true, data: companies, pagination: paginationMeta({ page, limit, skip }, total) });
  } catch (error) { next(error); }
};

export const getCompany = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const company = await targetCompany(req);
    const [userCount, clientCount, invoiceCount, tripCount] = await Promise.all([
      prisma.user.count({ where: { companyId: company.id } }),
      prisma.client.count({ where: { companyId: company.id } }),
      prisma.invoice.count({ where: { companyId: company.id } }),
      prisma.trip.count({ where: { companyId: company.id } }),
    ]);
    await recordSystemEvent(req, 'SUPERADMIN_COMPANY_VIEW', 'Company', company.id, company.id);
    res.json({ success: true, data: { ...company, summary: { userCount, clientCount, invoiceCount, tripCount } } });
  } catch (error) { next(error); }
};

export const createCompany = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { company, owner } = req.body;
    const existingOwner = await prisma.user.findUnique({ where: { email: owner.email }, select: { id: true } });
    if (existingOwner) throw new ConflictError('An account with this email already exists');

    const result = await prisma.$transaction(async (tx) => {
      const role = await tx.role.findUnique({ where: { name: 'ADMIN' }, select: { id: true } });
      if (!role) throw new NotFoundError('ADMIN role');
      const createdCompany = await tx.company.create({ data: company });
      const createdOwner = await tx.user.create({
        data: {
          name: owner.name, email: owner.email, password: await bcrypt.hash(owner.password, 12),
          phone: owner.phone, department: 'Management', roleId: role.id,
          companyId: createdCompany.id, scope: 'COMPANY',
        },
        select: { id: true, name: true, email: true, phone: true, companyId: true, scope: true, role: { select: { id: true, name: true } } },
      });
      return { company: createdCompany, owner: createdOwner };
    });

    await recordSystemEvent(req, 'SUPERADMIN_COMPANY_CREATE', 'Company', result.company.id, result.company.id, { ownerUserId: result.owner.id });
    res.status(201).json({ success: true, message: 'Company created successfully', data: result });
  } catch (error) { next(error); }
};

export const updateCompany = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await targetCompany(req);
    const company = await prisma.company.update({ where: { id: existing.id }, data: req.body });
    await recordSystemEvent(req, 'SUPERADMIN_COMPANY_UPDATE', 'Company', company.id, company.id, req.body);
    res.json({ success: true, message: 'Company updated successfully', data: company });
  } catch (error) { next(error); }
};

export const suspendCompany = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await targetCompany(req);
    const company = await prisma.company.update({ where: { id: existing.id }, data: { status: 'SUSPENDED' } });
    await recordSystemEvent(req, 'SUPERADMIN_COMPANY_SUSPEND', 'Company', company.id, company.id, { status: 'SUSPENDED' });
    res.json({ success: true, message: 'Company suspended successfully', data: company });
  } catch (error) { next(error); }
};

export const listUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search || '').trim();
    const companyId = String(req.query.companyId || '').trim();
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (search) where.OR = [{ name: { contains: search } }, { email: { contains: search } }];
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true, name: true, email: true, phone: true, department: true, status: true,
          scope: true, dateJoined: true, lastLoginAt: true,
          role: { select: { id: true, name: true, description: true } },
          company: { select: { id: true, name: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    await recordSystemRead(req, 'SUPERADMIN_USER_VIEW', 'User');
    res.json({ success: true, data: users, pagination: paginationMeta({ page, limit, skip }, total) });
  } catch (error) { next(error); }
};

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.userId }, include: { role: true } });
    if (!existing) throw new NotFoundError('User');
    if (existing.id === req.user!.id && req.body.status && req.body.status !== 'ACTIVE') throw new ForbiddenError('You cannot deactivate your own Super Admin account');

    const role = req.body.roleId ? await prisma.role.findUnique({ where: { id: req.body.roleId } }) : existing.role;
    if (!role) throw new NotFoundError('Role');
    const nextCompanyId = req.body.companyId === undefined ? existing.companyId : req.body.companyId;
    const isSuperAdmin = role.name === 'SUPERADMIN';
    if (isSuperAdmin && nextCompanyId) throw new ConflictError('SUPERADMIN users cannot be assigned to a company');
    if (!isSuperAdmin && !nextCompanyId) throw new ConflictError('Company users must be assigned to a company');
    if (nextCompanyId && !(await prisma.company.findUnique({ where: { id: nextCompanyId }, select: { id: true } }))) throw new NotFoundError('Company');

    const { companyId: _companyId, roleId: _roleId, ...profile } = req.body;
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: { ...profile, ...(req.body.roleId ? { roleId: req.body.roleId } : {}), companyId: nextCompanyId, scope: isSuperAdmin ? 'GLOBAL' : 'COMPANY', tokenVersion: { increment: 1 } },
      select: { id: true, name: true, email: true, phone: true, department: true, status: true, scope: true, companyId: true, role: { select: { id: true, name: true } }, company: { select: { id: true, name: true } } },
    });
    await recordSystemEvent(req, 'SUPERADMIN_USER_UPDATE', 'User', user.id, user.companyId, { roleId: req.body.roleId, companyId: user.companyId, status: user.status });
    res.json({ success: true, message: 'User updated successfully', data: user });
  } catch (error) { next(error); }
};

export const suspendUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.userId }, select: { id: true, companyId: true } });
    if (!existing) throw new NotFoundError('User');
    if (existing.id === req.user!.id) throw new ForbiddenError('You cannot suspend your own Super Admin account');
    const user = await prisma.user.update({
      where: { id: existing.id }, data: { status: 'SUSPENDED', tokenVersion: { increment: 1 } },
      select: { id: true, name: true, email: true, status: true, scope: true, companyId: true, role: { select: { name: true } } },
    });
    await recordSystemEvent(req, 'SUPERADMIN_USER_SUSPEND', 'User', user.id, user.companyId, { reason: req.body.reason, status: user.status });
    res.json({ success: true, message: 'User suspended successfully', data: user });
  } catch (error) { next(error); }
};

export const getGlobalReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [companies, users, clients, prospects, quotations, invoices, payments, trips] = await Promise.all([
      prisma.company.count(), prisma.user.count(), prisma.client.count(), prisma.prospect.count(),
      prisma.quotation.count(), prisma.invoice.count(), prisma.payment.count(), prisma.trip.count(),
    ]);
    await recordSystemRead(req, 'SUPERADMIN_GLOBAL_REPORT', 'GlobalReport');
    res.json({ success: true, data: { companies, users, clients, prospects, quotations, invoices, payments, trips } });
  } catch (error) { next(error); }
};

export const listGlobalAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const companyId = String(req.query.companyId || '').trim();
    const action = String(req.query.action || '').trim();
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (action) where.action = { contains: action };
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        select: {
          id: true, action: true, entity: true, entityId: true, changes: true,
          ipAddress: true, userAgent: true, createdAt: true,
          user: { select: { id: true, name: true, email: true, role: { select: { name: true } } } },
          company: { select: { id: true, name: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);
    await recordSystemRead(req, 'SUPERADMIN_AUDIT_VIEW', 'AuditLog');
    res.json({ success: true, data: logs, pagination: paginationMeta({ page, limit, skip }, total) });
  } catch (error) { next(error); }
};
