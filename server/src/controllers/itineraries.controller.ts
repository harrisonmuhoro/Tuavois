import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotFoundError } from '../utils/errors';
import { paginationMeta, parsePagination } from '../utils/pagination';

const generateItineraryNumber = async (): Promise<string> => {
  const count = await prisma.itinerary.count();
  return `ITN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
};

export const getItineraries = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { search = '', clientId, tripId, staffId } = req.query as Record<string, string>;
    const where: any = {};
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
    const itinerary = await prisma.itinerary.findUnique({
      where: { id: req.params.id },
      include: { client: true, trip: true, days: { orderBy: { sortOrder: 'asc' }, include: { activities: { orderBy: { sortOrder: 'asc' } } } } },
    });
    if (!itinerary) throw new NotFoundError('Itinerary');
    res.json({ success: true, data: itinerary });
  } catch (error) { next(error); }
};

export const createItinerary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { days = [], ...rest } = req.body;
    const itineraryNumber = await generateItineraryNumber();
    const itinerary = await prisma.itinerary.create({
      data: {
        ...rest, itineraryNumber, createdById: req.user!.id,
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
    const where: any = {};
    if (search) where.name = { contains: search };
    if (staffId) where.createdById = staffId;
    const templates = await prisma.itineraryTemplate.findMany({ where, orderBy: { updatedAt: 'desc' }, include: { createdBy: { select: { id: true, name: true } } } });
    res.json({ success: true, data: templates });
  } catch (error) { next(error); }
};

export const createTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const template = await prisma.itineraryTemplate.create({ data: { ...req.body, createdById: req.user!.id } });
    res.status(201).json({ success: true, message: 'Itinerary template created', data: template });
  } catch (error) { next(error); }
};

export const deleteTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { await prisma.itineraryTemplate.delete({ where: { id: req.params.id } }); res.json({ success: true, message: 'Itinerary template deleted', data: null }); } catch (error) { next(error); }
};

export const updateItinerary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { days = [], ...rest } = req.body;
    const itinerary = await prisma.$transaction(async (tx) => {
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
