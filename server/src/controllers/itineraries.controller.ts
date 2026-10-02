import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotFoundError } from '../utils/errors';
import { paginationMeta, parsePagination } from '../utils/pagination';
import { assertTenantRecord, tenantScope } from '../utils/tenant';

const generateItineraryNumber = async (req: AuthRequest): Promise<string> => {
  const count = await prisma.itinerary.count({ where: tenantScope(req) });
  return `ITN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
};

export const getItineraries = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { search = '', clientId, tripId, staffId } = req.query as Record<string, string>;
    const where: any = { ...tenantScope(req) };
    if (search) where.OR = [{ tripName: { contains: search } }, { destination: { contains: search } }, { itineraryNumber: { contains: search } }];
    if (clientId) where.clientId = clientId;
    if (tripId) where.tripId = tripId;
    if (staffId) where.createdById = staffId;

    const [itineraries, total] = await Promise.all([
      prisma.itinerary.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { client: { select: { id: true, fullName: true } }, createdBy: { select: { id: true, name: true } }, _count: { select: { days: true } } },
      }),
      prisma.itinerary.count({ where }),
    ]);
    res.json({ success: true, data: itineraries, pagination: paginationMeta({ page, limit, skip }, total) });
  } catch (error) { next(error); }
};

export const getItineraryById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const itinerary = await prisma.itinerary.findFirst({
      where: { id: req.params.id, ...tenantScope(req) },
      include: { client: true, trip: true, days: { orderBy: { sortOrder: 'asc' }, include: { activities: { orderBy: { sortOrder: 'asc' } } } } },
    });
    if (!itinerary) throw new NotFoundError('Itinerary');
    res.json({ success: true, data: itinerary });
  } catch (error) { next(error); }
};

export const createItinerary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { days = [], companyId: _companyId, ...rest } = req.body;
    await assertTenantRecord(prisma, 'client', rest.clientId, req.companyId!, 'Client');
    await assertTenantRecord(prisma, 'trip', rest.tripId, req.companyId!, 'Trip');
    const itineraryNumber = await generateItineraryNumber(req);
    const itinerary = await prisma.itinerary.create({
      data: {
        ...rest, itineraryNumber, createdById: req.user!.id, companyId: req.companyId,
        departureDate: new Date(rest.departureDate),
        returnDate: new Date(rest.returnDate),
        days: {
          create: days.map((day: any, dayIdx: number) => ({
            dayNumber: dayIdx + 1, title: day.title, date: day.date ? new Date(day.date) : undefined, sortOrder: dayIdx,
            activities: { create: (day.activities || []).map((act: any, actIdx: number) => ({ ...act, sortOrder: actIdx })) },
          })),
        },
      },
      include: { client: true, days: { include: { activities: true }, orderBy: { sortOrder: 'asc' } } },
    });
    res.status(201).json({ success: true, message: 'Itinerary created successfully', data: itinerary });
  } catch (error) { next(error); }
};

export const getTemplates = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search = '', staffId } = req.query as Record<string, string>;
    const where: any = { ...tenantScope(req) };
    if (search) where.name = { contains: search };
    if (staffId) where.createdById = staffId;
    const templates = await prisma.itineraryTemplate.findMany({ where, orderBy: { updatedAt: 'desc' }, include: { createdBy: { select: { id: true, name: true } } } });
    res.json({ success: true, data: templates });
  } catch (error) { next(error); }
};

export const createTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const template = await prisma.itineraryTemplate.create({ data: { ...req.body, createdById: req.user!.id, companyId: req.companyId } });
    res.status(201).json({ success: true, message: 'Itinerary template created', data: template });
  } catch (error) { next(error); }
};

export const deleteTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { const result = await prisma.itineraryTemplate.deleteMany({ where: { id: req.params.id, ...tenantScope(req) } }); if (!result.count) throw new NotFoundError('Itinerary template'); res.json({ success: true, message: 'Itinerary template deleted', data: null }); } catch (error) { next(error); }
};

export const updateItinerary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { days = [], companyId: _companyId, ...rest } = req.body;
    await assertTenantRecord(prisma, 'client', rest.clientId, req.companyId!, 'Client');
    await assertTenantRecord(prisma, 'trip', rest.tripId, req.companyId!, 'Trip');
    const itinerary = await prisma.$transaction(async (tx) => {
      const existing = await tx.itinerary.findFirst({ where: { id: req.params.id, ...tenantScope(req) } });
      if (!existing) throw new NotFoundError('Itinerary');
      // Delete old days (cascade deletes activities)
      await tx.itineraryDay.deleteMany({ where: { itineraryId: req.params.id } });
      return tx.itinerary.update({
        where: { id: req.params.id },
        data: {
          ...rest,
          departureDate: new Date(rest.departureDate), returnDate: new Date(rest.returnDate),
          days: {
            create: days.map((day: any, dayIdx: number) => ({
              dayNumber: dayIdx + 1, title: day.title, date: day.date ? new Date(day.date) : undefined, sortOrder: dayIdx,
              activities: { create: (day.activities || []).map((act: any, actIdx: number) => ({ ...act, sortOrder: actIdx })) },
            })),
          },
        },
        include: { client: true, days: { include: { activities: true }, orderBy: { sortOrder: 'asc' } } },
      });
    });
    res.json({ success: true, message: 'Itinerary updated successfully', data: itinerary });
  } catch (error) { next(error); }
};
