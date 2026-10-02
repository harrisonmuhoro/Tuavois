import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export const globalSearch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      res.json({ success: true, data: { clients: [], trips: [], invoices: [], quotations: [], vouchers: [], itineraries: [] } });
      return;
    }

    const isAdmin = req.user?.roleName === 'ADMIN';
    const staffScope = isAdmin ? {} : { assignedStaffId: req.user!.id };
    const createdScope = isAdmin ? {} : { createdById: req.user!.id };

    const [clients, trips, invoices, quotations, vouchers, itineraries] = await Promise.all([
      prisma.client.findMany({
        where: { ...staffScope, OR: [{ fullName: { contains: query } }, { email: { contains: query } }, { company: { contains: query } }] },
        take: 5, select: { id: true, fullName: true, company: true }
      }),
      prisma.trip.findMany({
        where: { ...(isAdmin ? {} : { assignedStaffId: req.user!.id }), OR: [{ name: { contains: query } }, { destination: { contains: query } }, { tripNumber: { contains: query } }] },
        take: 5, select: { id: true, name: true, tripNumber: true, status: true, startDate: true }
      }),
      prisma.invoice.findMany({
        where: { ...createdScope, OR: [{ invoiceNumber: { contains: query } }] },
        take: 5, select: { id: true, invoiceNumber: true, status: true, grandTotal: true, currency: true }
      }),
      prisma.quotation.findMany({
        where: { ...createdScope, OR: [{ quotationNumber: { contains: query } }, { destination: { contains: query } }] },
        take: 5, select: { id: true, quotationNumber: true, status: true, grandTotal: true, currency: true, destination: true }
      }),
      prisma.voucher.findMany({
        where: { ...(isAdmin ? {} : { trip: { assignedStaffId: req.user!.id } }), OR: [{ voucherNumber: { contains: query } }, { guestNames: { contains: query } }] },
        take: 5, select: { id: true, voucherNumber: true, type: true, guestNames: true }
      }),
      prisma.itinerary.findMany({
        where: { ...(isAdmin ? {} : { trip: { assignedStaffId: req.user!.id } }), OR: [{ itineraryNumber: { contains: query } }, { tripName: { contains: query } }, { destination: { contains: query } }] },
        take: 5, select: { id: true, itineraryNumber: true, tripName: true, destination: true }
      })
    ]);

    res.json({
      success: true,
      data: { clients, trips, invoices, quotations, vouchers, itineraries }
    });
  } catch (error) {
    next(error);
  }
};
