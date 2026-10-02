import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotFoundError } from '../utils/errors';
import { paginationMeta, parsePagination } from '../utils/pagination';

const generateClientNumber = async (): Promise<string> => {
  const count = await prisma.client.count();
  return `CLT-${String(count + 1).padStart(5, '0')}`;
};

export const getClients = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      search = '', assignedStaffId, sortBy = 'createdAt', sortOrder = 'desc',
    } = req.query as Record<string, string>;
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const safeSort = ['createdAt', 'fullName', 'clientNumber', 'company'].includes(sortBy) ? sortBy : 'createdAt';
    const safeOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { company: { contains: search } },
      ];
    }
    if (assignedStaffId) where.assignedStaffId = assignedStaffId;
    if (req.user?.roleName === 'SALES_CONSULTANT') where.assignedStaffId = req.user.id;

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { [safeSort]: safeOrder },
        include: {
          assignedStaff: { select: { id: true, name: true } },
          _count: { select: { quotations: true, invoices: true, trips: true } },
        },
      }),
      prisma.client.count({ where }),
    ]);

    res.json({
      success: true,
      data: clients,
      pagination: paginationMeta(pagination, total),
    });
  } catch (error) {
    next(error);
  }
};

export const getClientById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, ...(req.user?.roleName === 'SALES_CONSULTANT' ? { assignedStaffId: req.user.id } : {}) },
      include: {
        assignedStaff: { select: { id: true, name: true } },
        quotations: { orderBy: { createdAt: 'desc' }, take: 10 },
        invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
        payments: { orderBy: { paymentDate: 'desc' }, take: 10 },
        trips: { orderBy: { startDate: 'desc' }, take: 10 },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!client) throw new NotFoundError('Client');
    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

export const getClientActivity = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const client = await prisma.client.findFirst({ where: { id: req.params.id, ...(req.user?.roleName === 'SALES_CONSULTANT' ? { assignedStaffId: req.user.id } : {}) }, select: { id: true, quotations: { select: { id: true } }, invoices: { select: { id: true } }, trips: { select: { id: true } }, payments: { select: { id: true } } } });
    if (!client) throw new NotFoundError('Client');
    const entityIds = [client.id, ...client.quotations.map((item) => item.id), ...client.invoices.map((item) => item.id), ...client.trips.map((item) => item.id), ...client.payments.map((item) => item.id)];
    const activity = await prisma.auditLog.findMany({ where: { entityId: { in: entityIds } }, orderBy: { createdAt: 'desc' }, take: 100, include: { user: { select: { id: true, name: true, email: true } } } });
    res.json({ success: true, data: activity });
  } catch (error) { next(error); }
};

export const createClient = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const clientNumber = await generateClientNumber();
    const client = await prisma.client.create({
      data: { ...req.body, clientNumber },
      include: { assignedStaff: { select: { id: true, name: true } } },
    });
    res.status(201).json({ success: true, message: 'Client created successfully', data: client });
  } catch (error) {
    next(error);
  }
};

export const updateClient = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.client.findFirst({ where: { id: req.params.id, ...(req.user?.roleName === 'SALES_CONSULTANT' ? { assignedStaffId: req.user.id } : {}) } });
    if (!existing) throw new NotFoundError('Client');
    const client = await prisma.client.update({
      where: { id: existing.id },
      data: req.body,
      include: { assignedStaff: { select: { id: true, name: true } } },
    });
    res.json({ success: true, message: 'Client updated successfully', data: client });
  } catch (error) {
    next(error);
  }
};

export const deleteClient = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await prisma.client.deleteMany({ where: { id: req.params.id, ...(req.user?.roleName === 'SALES_CONSULTANT' ? { assignedStaffId: req.user.id } : {}) } });
    if (!result.count) throw new NotFoundError('Client');
    res.json({ success: true, message: 'Client deleted successfully', data: null });
  } catch (error) {
    next(error);
  }
};
