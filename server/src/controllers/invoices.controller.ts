import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotFoundError, ValidationError } from '../utils/errors';
import { reserveDocumentNumber } from '../utils/sequences';
import { processOverdueInvoices } from '../utils/overdue-invoices';
import { paginationMeta, parsePagination } from '../utils/pagination';

export const calculateInvoiceTotals = (items: { quantity: number; pax: number; unitPrice: number }[], discountType: 'AMOUNT' | 'PERCENTAGE', discountValue: number, taxRate: number) => {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountAmount = discountType === 'PERCENTAGE' ? (subtotal * discountValue) / 100 : discountValue;
  if (discountAmount > subtotal) throw new ValidationError('Discount cannot exceed the invoice subtotal');
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const grandTotal = taxableAmount + taxAmount;
  return { subtotal, discountAmount, taxAmount, grandTotal };
};

export const getInvoices = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await processOverdueInvoices();
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { search = '', status, clientId, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc' } = req.query as Record<string, string>;
    const safeSort = ['createdAt', 'invoiceNumber', 'invoiceDate', 'dueDate', 'grandTotal', 'balance'].includes(sortBy) ? sortBy : 'createdAt';
    const safeOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    const where: any = {};
    if (search) where.OR = [{ invoiceNumber: { contains: search } }];
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (dateFrom || dateTo) where.invoiceDate = { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined };
    if (req.user?.roleName === 'SALES_CONSULTANT') where.createdById = req.user.id;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where, skip, take: limit,
        orderBy: { [safeSort]: safeOrder },
        include: { client: { select: { id: true, fullName: true, company: true } }, trip: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } },
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({ success: true, data: invoices, pagination: paginationMeta({ page, limit, skip }, total) });
  } catch (error) { next(error); }
};

export const getInvoiceById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, ...(req.user?.roleName === 'SALES_CONSULTANT' ? { createdById: req.user.id } : {}) },
      include: { client: true, trip: true, items: { orderBy: { sortOrder: 'asc' } }, payments: { include: { receipt: true } }, creditNotes: true, createdBy: { select: { id: true, name: true } } },
    });
    if (!invoice) throw new NotFoundError('Invoice');
    res.json({ success: true, data: invoice });
  } catch (error) { next(error); }
};

export const createInvoice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { items, discountType = 'AMOUNT', discountValue = 0, taxRate = 0, ...rest } = req.body;
    const { subtotal, discountAmount, taxAmount, grandTotal } = calculateInvoiceTotals(items, discountType, discountValue, taxRate);
    const invoice = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await reserveDocumentNumber(tx, `invoice-${new Date().getFullYear()}`, `INV-${new Date().getFullYear()}`, 4);
      return tx.invoice.create({ data: {
        ...rest, invoiceNumber, discountType, discountValue, discountAmount, taxRate, taxAmount,
        subtotal, grandTotal, balance: grandTotal, status: 'DRAFT', createdById: req.user!.id,
        invoiceDate: new Date(rest.invoiceDate), dueDate: new Date(rest.dueDate),
        items: { create: items.map((item: any, idx: number) => ({ ...item, total: item.quantity * item.unitPrice, sortOrder: idx })) },
      }, include: { client: true, items: { orderBy: { sortOrder: 'asc' } } } });
    });
    res.status(201).json({ success: true, message: 'Invoice created successfully', data: invoice });
  } catch (error) { next(error); }
};

export const updateInvoice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, ...(req.user?.roleName === 'SALES_CONSULTANT' ? { createdById: req.user.id } : {}) } });
    if (!existing) throw new NotFoundError('Invoice');
    if (['PAID', 'CANCELLED'].includes(existing.status)) throw new ValidationError(`Cannot edit a ${existing.status.toLowerCase()} invoice`);

    const { items, discountType = 'AMOUNT', discountValue = 0, taxRate = 0, ...rest } = req.body;
    const { subtotal, discountAmount, taxAmount, grandTotal } = calculateInvoiceTotals(items, discountType, discountValue, taxRate);
    const balance = grandTotal - Number(existing.amountPaid) - Number(existing.creditApplied);

    const invoice = await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: req.params.id } });
      return tx.invoice.update({
        where: { id: req.params.id },
        data: {
          ...rest, discountType, discountValue, discountAmount, taxRate, taxAmount, subtotal, grandTotal, balance,
          invoiceDate: new Date(rest.invoiceDate), dueDate: new Date(rest.dueDate),
          items: { create: items.map((item: any, idx: number) => ({ ...item, total: item.quantity * item.unitPrice, sortOrder: idx })) },
        },
        include: { client: true, items: { orderBy: { sortOrder: 'asc' } } },
      });
    });
    res.json({ success: true, message: 'Invoice updated successfully', data: invoice });
  } catch (error) { next(error); }
};

export const updateInvoiceStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.body;
    const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, ...(req.user?.roleName === 'SALES_CONSULTANT' ? { createdById: req.user.id } : {}) } });
    if (!existing) throw new NotFoundError('Invoice');
    const invoice = await prisma.invoice.update({ where: { id: existing.id }, data: { status } });
    res.json({ success: true, message: 'Invoice status updated', data: invoice });
  } catch (error) { next(error); }
};
