import { NextFunction, Response } from 'express';
import ExcelJS from 'exceljs';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { ForbiddenError } from '../utils/errors';
import { tenantScope } from '../utils/tenant';

const dateFilter = (req: AuthRequest) => {
  const { dateFrom, dateTo } = req.query as Record<string, string>;
  return dateFrom || dateTo ? { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined } : undefined;
};

const tableFilters = (req: AuthRequest) => {
  const { dateFrom, dateTo, status, clientId, currency, search, staffId } = req.query as Record<string, string>;
  const date = dateFrom || dateTo ? { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined } : undefined;
  return { date, status, clientId, currency, search, staffId };
};

const sendWorkbook = async (res: Response, filename: string, sheetName: string, columns: string[], rows: Array<Record<string, unknown>>) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((header) => ({ header, key: header, width: Math.max(16, header.length + 3) }));
  rows.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F4C81' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').set('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
};

export const exportReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const type = req.params.type;
    if (req.user?.roleName === 'ACCOUNTANT' && type !== 'financial') throw new ForbiddenError('Accountants may export financial reports only');
    const date = dateFilter(req);
    const filters = tableFilters(req);
    if (type === 'financial') {
      const where: any = { ...tenantScope(req), ...(date ? { invoiceDate: date } : {}), ...(filters.status ? { status: filters.status } : {}), ...(filters.clientId ? { clientId: filters.clientId } : {}), ...(filters.currency ? { currency: filters.currency } : {}), ...(filters.search ? { invoiceNumber: { contains: filters.search } } : {}) };
      const invoices = await prisma.invoice.findMany({ where, include: { client: { select: { fullName: true } } }, orderBy: { invoiceDate: 'desc' } });
      await sendWorkbook(res, 'financial-report.xlsx', 'Financial report', ['Invoice', 'Client', 'Currency', 'Total', 'Paid', 'Balance', 'Status'], invoices.map((row) => ({ Invoice: row.invoiceNumber, Client: row.client.fullName, Currency: row.currency, Total: Number(row.grandTotal), Paid: Number(row.amountPaid), Balance: Number(row.balance), Status: row.status })));
      return;
    }
    if (type === 'trips') {
      const where: any = { ...tenantScope(req), ...(date ? { startDate: date } : {}), ...(filters.status ? { status: filters.status } : {}), ...(filters.clientId ? { clientId: filters.clientId } : {}), ...(filters.currency ? { currency: filters.currency } : {}), ...(filters.search ? { OR: [{ name: { contains: filters.search } }, { tripNumber: { contains: filters.search } }] } : {}) };
      const trips = await prisma.trip.findMany({ where, include: { client: { select: { fullName: true } }, _count: { select: { participants: true, expenses: true } } }, orderBy: { startDate: 'desc' } });
      await sendWorkbook(res, 'trips-report.xlsx', 'Trips report', ['Trip', 'Client', 'Destination', 'Status', 'Participants', 'Expenses'], trips.map((row) => ({ Trip: row.name, Client: row.client?.fullName || '', Destination: row.destination, Status: row.status, Participants: row._count.participants, Expenses: row._count.expenses })));
      return;
    }
    if (type === 'sales') {
      const where: any = { ...tenantScope(req), ...(date ? { createdAt: date } : {}), ...(filters.clientId ? { clientId: filters.clientId } : {}), ...(filters.currency ? { currency: filters.currency } : {}), ...(filters.status ? { status: filters.status } : {}) };
      const [quotations, invoices] = await Promise.all([prisma.quotation.groupBy({ by: ['status'], where, _count: { id: true }, _sum: { grandTotal: true } }), prisma.invoice.groupBy({ by: ['status'], where, _count: { id: true }, _sum: { grandTotal: true } })]);
      await sendWorkbook(res, 'sales-report.xlsx', 'Sales report', ['Record', 'Status', 'Count', 'Total'], [...quotations.map((row) => ({ Record: 'Quotation', Status: row.status, Count: row._count.id, Total: Number(row._sum.grandTotal || 0) })), ...invoices.map((row) => ({ Record: 'Invoice', Status: row.status, Count: row._count.id, Total: Number(row._sum.grandTotal || 0) }))]);
      return;
    }
    if (type === 'clients') {
      const where: any = { ...tenantScope(req), ...(filters.search ? { OR: [{ fullName: { contains: filters.search } }, { email: { contains: filters.search } }, { company: { contains: filters.search } }] } : {}) };
      const rows = await prisma.client.findMany({ where, include: { assignedStaff: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
      await sendWorkbook(res, 'clients.xlsx', 'Clients', ['Client number', 'Name', 'Company', 'Email', 'Phone', 'Nationality', 'Assigned staff', 'Created'], rows.map((row) => ({ 'Client number': row.clientNumber, Name: row.fullName, Company: row.company || '', Email: row.email || '', Phone: row.phone, Nationality: row.nationality, 'Assigned staff': row.assignedStaff?.name || '', Created: row.createdAt.toISOString() })));
      return;
    }
    if (type === 'prospects') {
      const where: any = { ...tenantScope(req), ...(filters.status ? { status: filters.status } : {}), ...(filters.search ? { OR: [{ fullName: { contains: filters.search } }, { email: { contains: filters.search } }, { phone: { contains: filters.search } }] } : {}) };
      const rows = await prisma.prospect.findMany({ where, include: { assignedStaff: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
      await sendWorkbook(res, 'prospects.xlsx', 'Prospects', ['Prospect number', 'Name', 'Company', 'Email', 'Phone', 'Status', 'Interest', 'Estimated value', 'Currency', 'Assigned staff'], rows.map((row) => ({ 'Prospect number': row.prospectNumber, Name: row.fullName, Company: row.company || '', Email: row.email || '', Phone: row.phone, Status: row.status, Interest: row.travelInterest || '', 'Estimated value': Number(row.estimatedValue || 0), Currency: row.currency, 'Assigned staff': row.assignedStaff?.name || '' })));
      return;
    }
    if (type === 'quotations') {
      const { dateFrom, dateTo, travelDateFrom, travelDateTo, specificDate, month, year, quotationType } = req.query as Record<string, string>;
      const createdAt: any = {};
      if (dateFrom) createdAt.gte = new Date(dateFrom);
      if (dateTo) createdAt.lte = new Date(dateTo);
      if (month) { createdAt.gte = new Date(Number(year || new Date().getFullYear()), Number(month) - 1, 1); createdAt.lt = new Date(Number(year || new Date().getFullYear()), Number(month), 1); }
      if (specificDate) { createdAt.gte = new Date(`${specificDate}T00:00:00`); createdAt.lt = new Date(`${specificDate}T00:00:00`); createdAt.lt.setDate(createdAt.lt.getDate() + 1); }
      const where: any = { ...tenantScope(req), ...(Object.keys(createdAt).length ? { createdAt } : {}), ...(filters.status ? { status: filters.status } : {}), ...(filters.clientId ? { clientId: filters.clientId } : {}), ...(filters.currency ? { currency: filters.currency } : {}), ...(quotationType ? { quotationType } : {}), ...(travelDateFrom || travelDateTo ? { travelStartDate: { gte: travelDateFrom ? new Date(travelDateFrom) : undefined, lte: travelDateTo ? new Date(travelDateTo) : undefined } } : {}), ...(filters.search ? { OR: [{ quotationNumber: { contains: filters.search } }, { destination: { contains: filters.search } }] } : {}) };
      const rows = await prisma.quotation.findMany({ where, include: { client: { select: { fullName: true } }, createdBy: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
      await sendWorkbook(res, 'quotations.xlsx', 'Quotations', ['Quotation', 'Client', 'Destination', 'Travel start', 'Travel end', 'Type', 'Currency', 'Total', 'Status', 'Worker', 'Created'], rows.map((row) => ({ Quotation: row.quotationNumber, Client: row.client.fullName, Destination: row.destination || '', 'Travel start': row.travelStartDate?.toISOString() || '', 'Travel end': row.travelEndDate?.toISOString() || '', Type: row.quotationType || '', Currency: row.currency, Total: Number(row.grandTotal), Status: row.status, Worker: row.createdBy?.name || '', Created: row.createdAt.toISOString() })));
      return;
    }
    if (type === 'itineraries') {
      const where: any = { ...tenantScope(req), ...(date ? { departureDate: date } : {}), ...(filters.clientId ? { clientId: filters.clientId } : {}), ...(filters.staffId ? { createdById: filters.staffId } : {}), ...(filters.search ? { OR: [{ itineraryNumber: { contains: filters.search } }, { tripName: { contains: filters.search } }, { destination: { contains: filters.search } }] } : {}) };
      const rows = await prisma.itinerary.findMany({ where, include: { client: { select: { fullName: true } }, createdBy: { select: { name: true } }, _count: { select: { days: true } } }, orderBy: { departureDate: 'desc' } });
      await sendWorkbook(res, 'itineraries.xlsx', 'Itineraries', ['Itinerary', 'Trip', 'Client', 'Destination', 'Departure', 'Return', 'Travellers', 'Days', 'Worker'], rows.map((row) => ({ Itinerary: row.itineraryNumber, Trip: row.tripName, Client: row.client.fullName, Destination: row.destination, Departure: row.departureDate.toISOString(), Return: row.returnDate.toISOString(), Travellers: row.numTravellers, Days: row._count.days, Worker: row.createdBy?.name || '' })));
      return;
    }
    if (type === 'letters') {
      const rows = await prisma.letter.findMany({ where: { ...tenantScope(req), ...(filters.staffId ? { createdById: filters.staffId } : {}) }, include: { createdBy: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
      await sendWorkbook(res, 'letters.xlsx', 'Letters', ['Letter', 'Details', 'Created by', 'Created'], rows.map((row) => ({ Letter: row.letterName, Details: row.details, 'Created by': row.createdBy.name, Created: row.createdAt.toISOString() })));
      return;
    }
    if (type === 'voucher-operations') {
      const { focus = 'check-in', date } = req.query as Record<string, string>;
      const day = date ? new Date(`${date}T00:00:00`) : new Date();
      const next = new Date(day); next.setDate(next.getDate() + 1);
      const field = focus === 'check-out' ? 'checkOut' : 'checkIn';
      const rows = await prisma.voucher.findMany({ where: { ...tenantScope(req), type: 'HOTEL', hotelDetails: { [field]: { gte: day, lt: next } } }, include: { client: { select: { fullName: true } }, trip: { select: { name: true } }, hotelDetails: true }, orderBy: { createdAt: 'desc' } });
      await sendWorkbook(res, 'voucher-operations.xlsx', 'Voucher operations', ['Voucher', 'Client', 'Hotel', 'Trip', 'Scheduled', 'Completed'], rows.map((row) => ({ Voucher: row.voucherNumber, Client: row.client.fullName, Hotel: row.hotelDetails?.hotel || '', Trip: row.trip?.name || '', Scheduled: (row.hotelDetails?.[field] as Date | undefined)?.toISOString() || '', Completed: (focus === 'check-out' ? row.hotelDetails?.checkedOutAt : row.hotelDetails?.checkedInAt)?.toISOString() || '' })));
      return;
    }
    if (type === 'invoices') {
      const where: any = { ...tenantScope(req), ...(filters.status ? { status: filters.status } : {}), ...(filters.clientId ? { clientId: filters.clientId } : {}), ...(filters.currency ? { currency: filters.currency } : {}), ...(filters.search ? { invoiceNumber: { contains: filters.search } } : {}) };
      const rows = await prisma.invoice.findMany({ where, include: { client: { select: { fullName: true } } }, orderBy: { invoiceDate: 'desc' } });
      await sendWorkbook(res, 'invoices.xlsx', 'Invoices', ['Invoice', 'Client', 'Date', 'Due date', 'Currency', 'Total', 'Paid', 'Credit', 'Balance', 'Status'], rows.map((row) => ({ Invoice: row.invoiceNumber, Client: row.client.fullName, Date: row.invoiceDate.toISOString(), 'Due date': row.dueDate.toISOString(), Currency: row.currency, Total: Number(row.grandTotal), Paid: Number(row.amountPaid), Credit: Number(row.creditApplied), Balance: Number(row.balance), Status: row.status })));
      return;
    }
    if (type === 'payments') {
      const where: any = { ...tenantScope(req), ...(date ? { paymentDate: date } : {}), ...(filters.clientId ? { clientId: filters.clientId } : {}), ...(filters.currency ? { currency: filters.currency } : {}), ...(filters.search ? { OR: [{ paymentNumber: { contains: filters.search } }, { reference: { contains: filters.search } }] } : {}) };
      const rows = await prisma.payment.findMany({ where, include: { client: { select: { fullName: true } }, invoice: { select: { invoiceNumber: true } } }, orderBy: { paymentDate: 'desc' } });
      await sendWorkbook(res, 'payments.xlsx', 'Payments', ['Payment', 'Invoice', 'Client', 'Date', 'Amount', 'Currency', 'Method', 'Reference'], rows.map((row) => ({ Payment: row.paymentNumber, Invoice: row.invoice.invoiceNumber, Client: row.client.fullName, Date: row.paymentDate.toISOString(), Amount: Number(row.amount), Currency: row.currency, Method: row.paymentMethod, Reference: row.reference || '' })));
      return;
    }
    if (type === 'vouchers') {
      const where: any = { ...tenantScope(req), ...(filters.status ? { status: filters.status } : {}), ...(filters.clientId ? { clientId: filters.clientId } : {}) };
      const rows = await prisma.voucher.findMany({ where, include: { client: { select: { fullName: true } }, trip: { select: { tripNumber: true, name: true } } }, orderBy: { createdAt: 'desc' } });
      await sendWorkbook(res, 'vouchers.xlsx', 'Vouchers', ['Voucher', 'Type', 'Client', 'Trip number', 'Trip', 'Guests', 'Created'], rows.map((row) => ({ Voucher: row.voucherNumber, Type: row.type, Client: row.client.fullName, 'Trip number': row.trip?.tripNumber || '', Trip: row.trip?.name || '', Guests: row.guestNames || '', Created: row.createdAt.toISOString() })));
      return;
    }
    if (type === 'credit-notes') {
      const where: any = { ...tenantScope(req), ...(filters.status ? { status: filters.status } : {}), ...(filters.clientId ? { clientId: filters.clientId } : {}), ...(filters.currency ? { currency: filters.currency } : {}) };
      const rows = await prisma.creditNote.findMany({ where, include: { client: { select: { fullName: true } }, invoice: { select: { invoiceNumber: true } } }, orderBy: { createdAt: 'desc' } });
      await sendWorkbook(res, 'credit-notes.xlsx', 'Credit notes', ['Credit note', 'Invoice', 'Client', 'Amount', 'Applied', 'Currency', 'Status', 'Reason', 'Created'], rows.map((row) => ({ 'Credit note': row.creditNoteNumber, Invoice: row.invoice.invoiceNumber, Client: row.client.fullName, Amount: Number(row.amount), Applied: Number(row.amountApplied), Currency: row.currency, Status: row.status, Reason: row.reason || '', Created: row.createdAt.toISOString() })));
      return;
    }
    res.status(404).json({ success: false, message: 'Unknown export type' });
  } catch (error) { next(error); }
};
