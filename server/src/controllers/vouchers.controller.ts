import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotFoundError, ValidationError } from '../utils/errors';
import { paginationMeta, parsePagination } from '../utils/pagination';

const generateVoucherNumber = async (): Promise<string> => {
  const count = await prisma.voucher.count();
  return `VCH-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
};
const operationsScope = (req: AuthRequest) => req.user?.roleName === 'OPERATIONS_STAFF' ? { trip: { assignedStaffId: req.user.id } } : {};

export const getVouchers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { type, clientId, tripId, status } = req.query as Record<string, string>;
    const where: any = {};
    if (type) where.type = type;
    if (clientId) where.clientId = clientId;
    if (tripId) where.tripId = tripId;
    if (status) where.status = status;
    Object.assign(where, operationsScope(req));

    const [vouchers, total] = await Promise.all([
      prisma.voucher.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { client: { select: { id: true, fullName: true } }, hotelDetails: true, transferDetails: true, services: true },
      }),
      prisma.voucher.count({ where }),
    ]);
    res.json({ success: true, data: vouchers, pagination: paginationMeta({ page, limit, skip }, total) });
  } catch (error) { next(error); }
};

const operationDateRange = (value?: string) => {
  const start = value ? new Date(`${value}T00:00:00`) : new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
};

export const getVoucherOperations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { focus = 'check-in', date } = req.query as Record<string, string>;
    if (!['check-in', 'check-out'].includes(focus)) throw new ValidationError('Invalid voucher operation focus');
    const dateFilter = focus === 'check-in' ? { checkIn: operationDateRange(date) } : { checkOut: operationDateRange(date) };
    const vouchers = await prisma.voucher.findMany({ where: { type: 'HOTEL', hotelDetails: dateFilter, ...operationsScope(req) }, orderBy: { createdAt: 'desc' }, include: { client: { select: { id: true, fullName: true, phone: true } }, trip: { select: { id: true, name: true, tripNumber: true } }, hotelDetails: true } });
    res.json({ success: true, data: vouchers });
  } catch (error) { next(error); }
};

export const completeVoucherOperation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { operation } = req.body as { operation?: string };
    if (!['check-in', 'check-out'].includes(operation || '')) throw new ValidationError('Invalid voucher operation');
    const voucher = await prisma.voucher.findFirst({ where: { id: req.params.id, ...operationsScope(req) }, include: { hotelDetails: true } });
    if (!voucher?.hotelDetails) throw new NotFoundError('Hotel voucher');
    const data = operation === 'check-in' ? { checkedInAt: new Date() } : { checkedOutAt: new Date() };
    const updated = await prisma.hotelVoucher.update({ where: { voucherId: voucher.id }, data });
    res.json({ success: true, message: `${operation === 'check-in' ? 'Check-in' : 'Check-out'} recorded`, data: updated });
  } catch (error) { next(error); }
};

export const getVoucherById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const voucher = await prisma.voucher.findFirst({
      where: { id: req.params.id, ...operationsScope(req) },
      include: { client: true, trip: true, hotelDetails: true, transferDetails: true, services: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!voucher) throw new NotFoundError('Voucher');
    res.json({ success: true, data: voucher });
  } catch (error) { next(error); }
};

export const createVoucher = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, clientId, tripId, guestNames, notes, hotelDetails, transferDetails, services } = req.body;
    const voucherNumber = await generateVoucherNumber();

    const voucher = await prisma.voucher.create({
      data: {
        voucherNumber, type, clientId, tripId, guestNames, notes,
        ...(type === 'HOTEL' && hotelDetails ? { hotelDetails: { create: { ...hotelDetails, checkIn: new Date(hotelDetails.checkIn), checkOut: new Date(hotelDetails.checkOut) } } } : {}),
        ...(type === 'TRANSFER' && transferDetails ? { transferDetails: { create: { ...transferDetails, date: new Date(transferDetails.date) } } } : {}),
        ...(type === 'SERVICE' && services ? { services: { create: services.map((s: any, idx: number) => ({ ...s, date: s.date ? new Date(s.date) : undefined, sortOrder: idx })) } } : {}),
      },
      include: { client: true, hotelDetails: true, transferDetails: true, services: true },
    });
    res.status(201).json({ success: true, message: 'Voucher created successfully', data: voucher });
  } catch (error) { next(error); }
};

const allowedTransitions: Record<string, string[]> = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const updateVoucherStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, supplierConfirmationRef } = req.body;
    const current = await prisma.voucher.findFirst({ where: { id: req.params.id, ...operationsScope(req) } });
    if (!current) throw new NotFoundError('Voucher');
    if (!allowedTransitions[current.status].includes(status)) throw new ValidationError(`Cannot change voucher status from ${current.status} to ${status}`);
    const updated = await prisma.voucher.update({ where: { id: current.id }, data: { status, supplierConfirmationRef, supplierConfirmedAt: status === 'CONFIRMED' ? new Date() : current.supplierConfirmedAt } });
    res.json({ success: true, message: 'Voucher status updated successfully', data: updated });
  } catch (error) { next(error); }
};
