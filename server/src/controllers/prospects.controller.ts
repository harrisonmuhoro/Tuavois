import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { paginationMeta, parsePagination } from '../utils/pagination';

export const getProspects = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { search = '', status, assignedStaffId } = req.query as Record<string, string>;
    const where: any = {};
    if (search) where.OR = [{ fullName: { contains: search } }, { phone: { contains: search } }, { email: { contains: search } }];
    if (status) where.status = status;
    if (assignedStaffId) where.assignedStaffId = assignedStaffId;
    if (req.user?.roleName === 'SALES_CONSULTANT') where.assignedStaffId = req.user.id;

    const [prospects, total] = await Promise.all([
      prisma.prospect.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { assignedStaff: { select: { id: true, name: true } } },
      }),
      prisma.prospect.count({ where }),
    ]);
    res.json({ success: true, data: prospects, pagination: paginationMeta({ page, limit, skip }, total) });
  } catch (error) { next(error); }
};

export const createProspect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const count = await prisma.prospect.count();
    const prospectNumber = `PRO-${String(count + 1).padStart(5, '0')}`;
    const prospect = await prisma.prospect.create({ data: { ...req.body, prospectNumber } });
    res.status(201).json({ success: true, message: 'Prospect created successfully', data: prospect });
  } catch (error) { next(error); }
};

export const updateProspect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.prospect.findFirst({ where: { id: req.params.id, ...(req.user?.roleName === 'SALES_CONSULTANT' ? { assignedStaffId: req.user.id } : {}) } });
    if (!existing) { res.status(404).json({ success: false, message: 'Prospect not found' }); return; }
    const prospect = await prisma.prospect.update({ where: { id: existing.id }, data: req.body });
    res.json({ success: true, message: 'Prospect updated successfully', data: prospect });
  } catch (error) { next(error); }
};

export const convertProspectToClient = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prospect = await prisma.prospect.findFirst({ where: { id: req.params.id, ...(req.user?.roleName === 'SALES_CONSULTANT' ? { assignedStaffId: req.user.id } : {}) } });
    if (!prospect) { res.status(404).json({ success: false, message: 'Prospect not found' }); return; }

    const count = await prisma.client.count();
    const clientNumber = `CLT-${String(count + 1).padStart(5, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: { clientNumber, fullName: prospect.fullName, company: prospect.company ?? undefined, phone: prospect.phone, email: prospect.email ?? undefined, nationality: prospect.nationality ?? undefined, assignedStaffId: prospect.assignedStaffId ?? undefined },
      });
      await tx.prospect.update({ where: { id: prospect.id }, data: { status: 'WON', convertedToClientId: client.id, convertedAt: new Date() } });
      return client;
    });
    res.json({ success: true, message: 'Prospect converted to client', data: result });
  } catch (error) { next(error); }
};
