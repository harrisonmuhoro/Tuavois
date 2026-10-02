import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { ForbiddenError } from '../utils/errors';
import PDFDocument from 'pdfkit';

const range = (req: AuthRequest) => {
  const { dateFrom, dateTo, status, currency, staffId, clientId } = req.query as Record<string, string>;
  const date = dateFrom || dateTo ? { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined } : undefined;
  return { date, status, currency, staffId, clientId };
};

export const getFinancialReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { date, status, currency, staffId, clientId } = range(req);
    const where: any = { ...(date ? { invoiceDate: date } : {}), ...(status ? { status } : {}), ...(currency ? { currency } : {}), ...(staffId ? { createdById: staffId } : {}), ...(clientId ? { clientId } : {}) };
    const [invoices, payments, expenses] = await Promise.all([
      prisma.invoice.findMany({ where, include: { client: { select: { fullName: true } } }, orderBy: { invoiceDate: 'desc' } }),
      prisma.payment.findMany({ where: { ...(date ? { paymentDate: date } : {}), ...(currency ? { currency } : {}), ...(clientId ? { clientId } : {}) }, include: { client: { select: { fullName: true } }, invoice: { select: { invoiceNumber: true } } }, orderBy: { paymentDate: 'desc' } }),
      prisma.tripExpense.findMany({ where: { ...(date ? { date } : {}), ...(currency ? { currency } : {}) }, include: { trip: { select: { name: true } } }, orderBy: { date: 'desc' } }),
    ]);
    const summaryByCurrency: Record<string, { revenue: number; collected: number; outstanding: number; expenses: number; profit: number }> = {};
    const bucket = (currency: string) => summaryByCurrency[currency] ||= { revenue: 0, collected: 0, outstanding: 0, expenses: 0, profit: 0 };
    invoices.forEach((invoice) => { bucket(invoice.currency).revenue += Number(invoice.grandTotal); bucket(invoice.currency).outstanding += Number(invoice.balance); });
    payments.forEach((payment) => { bucket(payment.currency).collected += Number(payment.amount); });
    expenses.forEach((expense) => { bucket(expense.currency).expenses += Number(expense.amount); });
    Object.values(summaryByCurrency).forEach((summary) => { summary.profit = summary.collected - summary.expenses; });
    const currencies = Object.keys(summaryByCurrency);
    const summary = currencies.length === 1 ? summaryByCurrency[currencies[0]] : null;
    res.json({ success: true, data: { summary, summaryByCurrency, currencies, invoices, payments, expenses } });
  } catch (error) { next(error); }
};

export const getSalesReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { date, currency, staffId, clientId } = range(req);
    const where: any = { ...(date ? { createdAt: date } : {}), ...(currency ? { currency } : {}), ...(staffId ? { createdById: staffId } : {}), ...(clientId ? { clientId } : {}) };
    const [quotations, invoices] = await Promise.all([prisma.quotation.groupBy({ by: ['status'], where, _count: { id: true }, _sum: { grandTotal: true } }), prisma.invoice.groupBy({ by: ['status'], where, _count: { id: true }, _sum: { grandTotal: true } })]);
    res.json({ success: true, data: { quotations, invoices } });
  } catch (error) { next(error); }
};

export const getQuotationReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dateFrom, dateTo, travelDateFrom, travelDateTo, specificDate, month, year, currency, paymentStatus, staffId, quotationType } = req.query as Record<string, string>;
    const createdAt: any = {};
    if (dateFrom) createdAt.gte = new Date(dateFrom);
    if (dateTo) createdAt.lte = new Date(dateTo);
    if (month) { createdAt.gte = new Date(Number(year || new Date().getFullYear()), Number(month) - 1, 1); createdAt.lt = new Date(Number(year || new Date().getFullYear()), Number(month), 1); }
    if (specificDate) { createdAt.gte = new Date(`${specificDate}T00:00:00`); createdAt.lt = new Date(`${specificDate}T00:00:00`); createdAt.lt.setDate(createdAt.lt.getDate() + 1); }
    const where: any = { ...(Object.keys(createdAt).length ? { createdAt } : {}), ...(currency ? { currency } : {}), ...(paymentStatus ? { status: paymentStatus } : {}), ...(staffId ? { createdById: staffId } : {}), ...(quotationType ? { quotationType } : {}) };
    if (travelDateFrom || travelDateTo) where.travelStartDate = { gte: travelDateFrom ? new Date(travelDateFrom) : undefined, lte: travelDateTo ? new Date(travelDateTo) : undefined };
    const quotations = await prisma.quotation.findMany({ where, orderBy: { createdAt: 'desc' }, include: { client: { select: { id: true, fullName: true } }, createdBy: { select: { id: true, name: true } } } });
    res.json({ success: true, data: { quotations, filters: { dateFrom, dateTo, travelDateFrom, travelDateTo, specificDate, month, year, currency, paymentStatus, staffId, quotationType } } });
  } catch (error) { next(error); }
};

export const getTripsReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { date, status, currency, staffId, clientId } = range(req);
    const where: any = { ...(date ? { startDate: date } : {}), ...(status ? { status } : {}), ...(currency ? { currency } : {}), ...(staffId ? { assignedStaffId: staffId } : {}), ...(clientId ? { clientId } : {}) };
    const [trips, grouped] = await Promise.all([prisma.trip.findMany({ where, include: { client: { select: { fullName: true } }, _count: { select: { participants: true, expenses: true, vouchers: true } }, }, orderBy: { startDate: 'desc' } }), prisma.trip.groupBy({ by: ['status'], where, _count: { id: true }, _sum: { actualRevenue: true, actualCost: true } })]);
    res.json({ success: true, data: { grouped, trips } });
  } catch (error) { next(error); }
};

export const reportPdf = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const type = req.params.type;
    if (req.user?.roleName === 'ACCOUNTANT' && type !== 'financial') throw new ForbiddenError('Accountants may access financial reports only');
    if (!['financial', 'sales', 'trips', 'quotations', 'itineraries', 'letters', 'voucher-operations'].includes(type)) {
      res.status(400).json({ success: false, message: 'Unsupported report type' });
      return;
    }
    const document = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `${type} report`, Author: 'TuaVois Travel' } });
    res.type('application/pdf').set('Content-Disposition', `attachment; filename="${type}-report.pdf"`);
    document.pipe(res);
    document.fillColor('#0f4c81').fontSize(22).font('Helvetica-Bold').text(`${type[0].toUpperCase()}${type.slice(1)} report`);
    document.moveDown(0.4).fillColor('#172033').fontSize(10).font('Helvetica').text(`Generated ${new Date().toLocaleString()}`);
    const { dateFrom, dateTo } = req.query as Record<string, string>;
    if (dateFrom || dateTo) document.text(`Period: ${dateFrom || 'start'} to ${dateTo || 'present'}`);
    document.moveDown();

    if (type === 'financial') {
      const { date, status, currency, staffId, clientId } = range(req);
      const where: any = { ...(date ? { invoiceDate: date } : {}), ...(status ? { status } : {}), ...(currency ? { currency } : {}), ...(staffId ? { createdById: staffId } : {}), ...(clientId ? { clientId } : {}) };
      const [invoices, payments, expenses] = await Promise.all([
        prisma.invoice.findMany({ where, select: { currency: true, grandTotal: true, balance: true } }),
        prisma.payment.findMany({ where: { ...(date ? { paymentDate: date } : {}), ...(currency ? { currency } : {}), ...(clientId ? { clientId } : {}) }, select: { currency: true, amount: true } }),
        prisma.tripExpense.findMany({ where: { ...(date ? { date } : {}), ...(currency ? { currency } : {}) }, select: { currency: true, amount: true } }),
      ]);
      const summary: Record<string, { revenue: number; collected: number; outstanding: number; expenses: number; profit: number }> = {};
      const bucket = (key: string) => summary[key] ||= { revenue: 0, collected: 0, outstanding: 0, expenses: 0, profit: 0 };
      invoices.forEach((row) => { bucket(row.currency).revenue += Number(row.grandTotal); bucket(row.currency).outstanding += Number(row.balance); });
      payments.forEach((row) => { bucket(row.currency).collected += Number(row.amount); });
      expenses.forEach((row) => { bucket(row.currency).expenses += Number(row.amount); });
      Object.entries(summary).forEach(([key, row]) => { row.profit = row.collected - row.expenses; document.font('Helvetica-Bold').text(`${key}`); document.font('Helvetica').text(`Revenue: ${row.revenue.toFixed(2)}   Collected: ${row.collected.toFixed(2)}   Outstanding: ${row.outstanding.toFixed(2)}`); document.text(`Expenses: ${row.expenses.toFixed(2)}   Profit: ${row.profit.toFixed(2)}`).moveDown(0.5); });
      document.text(`Invoices included: ${invoices.length}`);
    } else if (type === 'sales') {
      const { date, currency, staffId, clientId } = range(req);
      const where: any = { ...(date ? { createdAt: date } : {}), ...(currency ? { currency } : {}), ...(staffId ? { createdById: staffId } : {}), ...(clientId ? { clientId } : {}) };
      const [quotations, invoices] = await Promise.all([prisma.quotation.findMany({ where, select: { status: true, grandTotal: true } }), prisma.invoice.findMany({ where, select: { status: true, grandTotal: true } })]);
      document.text(`Quotations: ${quotations.length}   Total: ${quotations.reduce((sum, row) => sum + Number(row.grandTotal), 0).toFixed(2)}`);
      document.text(`Invoices: ${invoices.length}   Total: ${invoices.reduce((sum, row) => sum + Number(row.grandTotal), 0).toFixed(2)}`);
    } else if (type === 'quotations') {
      const { dateFrom, dateTo, travelDateFrom, travelDateTo, currency, paymentStatus, staffId, quotationType } = req.query as Record<string, string>;
      const where: any = { ...(dateFrom || dateTo ? { createdAt: { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined } } : {}), ...(currency ? { currency } : {}), ...(paymentStatus ? { status: paymentStatus } : {}), ...(staffId ? { createdById: staffId } : {}), ...(quotationType ? { quotationType } : {}), ...(travelDateFrom || travelDateTo ? { travelStartDate: { gte: travelDateFrom ? new Date(travelDateFrom) : undefined, lte: travelDateTo ? new Date(travelDateTo) : undefined } } : {}) };
      const quotations = await prisma.quotation.findMany({ where, include: { client: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' } });
      document.text(`Quotations included: ${quotations.length}`).moveDown(0.5);
      quotations.slice(0, 40).forEach((quotation) => document.text(`${quotation.quotationNumber} — ${quotation.client.fullName} — ${quotation.destination || 'No destination'} — ${quotation.status} — ${Number(quotation.grandTotal).toFixed(2)} ${quotation.currency}`));
    } else if (type === 'itineraries') {
      const { dateFrom, dateTo, clientId, staffId } = req.query as Record<string, string>;
      const where: any = { ...(dateFrom || dateTo ? { departureDate: { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined } } : {}), ...(clientId ? { clientId } : {}), ...(staffId ? { createdById: staffId } : {}) };
      const itineraries = await prisma.itinerary.findMany({ where, include: { client: { select: { fullName: true } } }, orderBy: { departureDate: 'desc' } });
      document.text(`Itineraries included: ${itineraries.length}`).moveDown(0.5);
      itineraries.slice(0, 40).forEach((itinerary) => document.text(`${itinerary.itineraryNumber} — ${itinerary.client.fullName} — ${itinerary.destination} — ${itinerary.departureDate.toLocaleDateString()} to ${itinerary.returnDate.toLocaleDateString()}`));
    } else if (type === 'letters') {
      const { staffId } = req.query as Record<string, string>;
      const letters = await prisma.letter.findMany({ where: staffId ? { createdById: staffId } : {}, include: { createdBy: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
      document.text(`Letters included: ${letters.length}`).moveDown(0.5);
      letters.slice(0, 30).forEach((letter) => document.font('Helvetica-Bold').text(letter.letterName).font('Helvetica').text(`Created by: ${letter.createdBy.name}`).text(letter.details).moveDown(0.5));
    } else if (type === 'voucher-operations') {
      const { focus = 'check-in', date } = req.query as Record<string, string>;
      const day = date ? new Date(`${date}T00:00:00`) : new Date(); const next = new Date(day); next.setDate(next.getDate() + 1); const field = focus === 'check-out' ? 'checkOut' : 'checkIn';
      const vouchers = await prisma.voucher.findMany({ where: { type: 'HOTEL', hotelDetails: { [field]: { gte: day, lt: next } } }, include: { client: { select: { fullName: true } }, trip: { select: { name: true } }, hotelDetails: true }, orderBy: { createdAt: 'desc' } });
      document.text(`Voucher operations included: ${vouchers.length}`).moveDown(0.5);
      vouchers.slice(0, 40).forEach((voucher) => document.text(`${voucher.voucherNumber} — ${voucher.client.fullName} — ${voucher.hotelDetails?.hotel || 'No hotel'} — ${voucher.trip?.name || 'No trip'}`));
    } else {
      const { date, status, currency, staffId, clientId } = range(req);
      const where: any = { ...(date ? { startDate: date } : {}), ...(status ? { status } : {}), ...(currency ? { currency } : {}), ...(staffId ? { assignedStaffId: staffId } : {}), ...(clientId ? { clientId } : {}) };
      const trips = await prisma.trip.findMany({ where, select: { name: true, status: true, destination: true } });
      document.text(`Trips included: ${trips.length}`).moveDown(0.5);
      trips.slice(0, 40).forEach((trip) => document.text(`${trip.name} — ${trip.destination || 'No destination'} — ${trip.status}`));
    }
    document.end();
  } catch (error) { next(error); }
};
