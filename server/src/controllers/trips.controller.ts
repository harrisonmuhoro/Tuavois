import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotFoundError } from '../utils/errors';
import { paginationMeta, parsePagination } from '../utils/pagination';

const generateTripNumber = async (): Promise<string> => {
  const count = await prisma.trip.count();
  return `TRP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
};
const operationsScope = (req: AuthRequest) => req.user?.roleName === 'OPERATIONS_STAFF' ? { assignedStaffId: req.user.id } : {};

export const getTrips = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { search = '', status, clientId, assignedStaffId, dateFrom, dateTo } = req.query as Record<string, string>;

    const where: any = {};
    if (search) where.OR = [{ name: { contains: search } }, { destination: { contains: search } }, { tripNumber: { contains: search } }];
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (assignedStaffId) where.assignedStaffId = assignedStaffId;
    Object.assign(where, operationsScope(req));
    if (dateFrom || dateTo) where.startDate = { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined };

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where, skip, take: limit, orderBy: { startDate: 'desc' },
        include: {
          client: { select: { id: true, fullName: true, company: true } },
          assignedStaff: { select: { id: true, name: true } },
          _count: { select: { participants: true, expenses: true, vouchers: true } },
        },
      }),
      prisma.trip.count({ where }),
    ]);

    res.json({ success: true, data: trips, pagination: paginationMeta({ page, limit, skip }, total) });
  } catch (error) { next(error); }
};

export const getTripById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const trip = await prisma.trip.findFirst({
      where: { id: req.params.id, ...operationsScope(req) },
      include: {
        client: true, assignedStaff: { select: { id: true, name: true } },
        participants: true, expenses: true,
        itineraries: { include: { days: { include: { activities: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } } } },
        vouchers: { include: { hotelDetails: true, transferDetails: true, services: true } },
        invoices: { include: { payments: true } },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!trip) throw new NotFoundError('Trip');
    res.json({ success: true, data: trip });
  } catch (error) { next(error); }
};

export const createTrip = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tripNumber = await generateTripNumber();
    const trip = await prisma.trip.create({
      data: { ...req.body, tripNumber, startDate: new Date(req.body.startDate), endDate: new Date(req.body.endDate) },
      include: { client: true, assignedStaff: { select: { id: true, name: true } } },
    });
    if (trip.assignedStaffId) {
      await prisma.notification.create({ data: { userId: trip.assignedStaffId, title: 'Trip assigned', message: `You have been assigned trip ${trip.tripNumber} to ${trip.destination}.`, type: 'TRIP', entityType: 'Trip', entityId: trip.id } });
    }
    res.status(201).json({ success: true, message: 'Trip created successfully', data: trip });
  } catch (error) { next(error); }
};

export const updateTrip = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const previous = await prisma.trip.findFirst({ where: { id: req.params.id, ...operationsScope(req) } });
    if (!previous) throw new NotFoundError('Trip');
    const data: any = { ...req.body };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);
    const trip = await prisma.trip.update({ where: { id: req.params.id }, data, include: { client: true } });
    if (trip.assignedStaffId && (trip.assignedStaffId !== previous.assignedStaffId || trip.status !== previous.status)) {
      const reason = trip.assignedStaffId !== previous.assignedStaffId ? 'assigned to you' : `status changed to ${trip.status}`;
      await prisma.notification.create({ data: { userId: trip.assignedStaffId, title: 'Trip update', message: `Trip ${trip.tripNumber} was ${reason}.`, type: 'TRIP', entityType: 'Trip', entityId: trip.id } });
    }
    res.json({ success: true, message: 'Trip updated successfully', data: trip });
  } catch (error) { next(error); }
};

export const addParticipant = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const trip = await prisma.trip.findFirst({ where: { id: req.params.id, ...operationsScope(req) } });
    if (!trip) throw new NotFoundError('Trip');
    const participant = await prisma.tripParticipant.create({ data: { ...req.body, tripId: req.params.id, dateAdded: req.body.dateAdded ? new Date(req.body.dateAdded) : undefined, dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : undefined } });
    res.status(201).json({ success: true, message: 'Participant added', data: participant });
  } catch (error) { next(error); }
};

export const removeParticipant = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await prisma.tripParticipant.deleteMany({ where: { id: req.params.participantId, trip: operationsScope(req) } });
    if (!result.count) throw new NotFoundError('Trip participant');
    res.json({ success: true, message: 'Participant removed', data: null });
  } catch (error) { next(error); }
};

export const updateParticipant = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = { ...req.body, dateAdded: req.body.dateAdded ? new Date(req.body.dateAdded) : undefined, dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : undefined };
    const participant = await prisma.tripParticipant.updateMany({ where: { id: req.params.participantId, tripId: req.params.id, trip: operationsScope(req) }, data });
    if (participant.count === 0) throw new NotFoundError('Trip participant');
    res.json({ success: true, message: 'Participant updated', data: await prisma.tripParticipant.findUnique({ where: { id: req.params.participantId } }) });
  } catch (error) { next(error); }
};

export const addExpense = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const exchangeRate = req.body.exchangeRate || 1;
    const baseAmount = req.body.amount * exchangeRate;
    const trip = await prisma.trip.findFirst({ where: { id: req.params.id, ...operationsScope(req) } });
    if (!trip) throw new NotFoundError('Trip');
    const expense = await prisma.tripExpense.create({
      data: { ...req.body, tripId: req.params.id, date: new Date(req.body.date), exchangeRate, baseAmount },
    });
    res.status(201).json({ success: true, message: 'Expense added', data: expense });
  } catch (error) { next(error); }
};

export const removeExpense = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await prisma.tripExpense.deleteMany({ where: { id: req.params.expenseId, trip: operationsScope(req) } });
    if (!result.count) throw new NotFoundError('Trip expense');
    res.json({ success: true, message: 'Expense removed', data: null });
  } catch (error) { next(error); }
};

export const updateExpense = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const exchangeRate = req.body.exchangeRate || 1;
    const amount = Number(req.body.amount);
    const expense = await prisma.tripExpense.updateMany({ where: { id: req.params.expenseId, tripId: req.params.id, trip: operationsScope(req) }, data: { ...req.body, amount, exchangeRate, baseAmount: amount * exchangeRate, date: new Date(req.body.date) } });
    if (expense.count === 0) throw new NotFoundError('Trip expense');
    res.json({ success: true, message: 'Expense updated', data: await prisma.tripExpense.findUnique({ where: { id: req.params.expenseId } }) });
  } catch (error) { next(error); }
};
