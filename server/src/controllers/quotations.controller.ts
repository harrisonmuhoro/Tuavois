import { Response, NextFunction } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotFoundError, ValidationError } from '../utils/errors';
import { reserveDocumentNumber } from '../utils/sequences';
import { paginationMeta, parsePagination } from '../utils/pagination';

// =============================================
// Financial Calculation Helpers
// =============================================

const calculateTotals = (
  items: { quantity: number; unitPrice: number }[],
  discountType: 'AMOUNT' | 'PERCENTAGE',
  discountValue: number,
  taxRate: number
) => {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountAmount = discountType === 'PERCENTAGE' ? (subtotal * discountValue) / 100 : discountValue;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const grandTotal = taxableAmount + taxAmount;
  return { subtotal, discountAmount, taxAmount, grandTotal };
};

const generateQuotationNumber = async (): Promise<string> => {
  const count = await prisma.quotation.count();
  const year = new Date().getFullYear();
  return `QT-${year}-${String(count + 1).padStart(4, '0')}`;
};

// =============================================
// Quotation Controllers
// =============================================

export const getQuotations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { search = '', status, clientId, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc' } = req.query as Record<string, string>;
    const safeSort = ['createdAt', 'quotationNumber', 'validUntil', 'grandTotal'].includes(sortBy) ? sortBy : 'createdAt';
    const safeOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    const where: any = {};
    if (search) where.OR = [{ quotationNumber: { contains: search } }, { destination: { contains: search } }];
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (dateFrom || dateTo) where.createdAt = { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined };
    if (req.user?.roleName === 'SALES_CONSULTANT') where.createdById = req.user.id;

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where, skip, take: limit,
        orderBy: { [safeSort]: safeOrder },
        include: { client: { select: { id: true, fullName: true, company: true } }, items: true, createdBy: { select: { id: true, name: true } } },
      }),
      prisma.quotation.count({ where }),
    ]);

    res.json({ success: true, data: quotations, pagination: paginationMeta({ page, limit, skip }, total) });
  } catch (error) { next(error); }
};

export const getQuotationById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const quotation = await prisma.quotation.findFirst({
      where: { id: req.params.id, ...(req.user?.roleName === 'SALES_CONSULTANT' ? { createdById: req.user.id } : {}) },
      include: { client: true, items: { orderBy: { sortOrder: 'asc' } }, createdBy: { select: { id: true, name: true } } },
    });
    if (!quotation) throw new NotFoundError('Quotation');
    res.json({ success: true, data: quotation });
  } catch (error) { next(error); }
};

export const createQuotation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { items, discountType, discountValue, taxRate, ...rest } = req.body;
    const { subtotal, discountAmount, taxAmount, grandTotal } = calculateTotals(items, discountType, discountValue, taxRate);
    const quotationNumber = await generateQuotationNumber();

    const quotation = await prisma.quotation.create({
      data: {
        ...rest, quotationNumber, discountType, discountValue, discountAmount, taxRate, taxAmount,
        subtotal, grandTotal, status: 'DRAFT', createdById: req.user!.id,
        items: { create: items.map((item: any, idx: number) => ({ ...item, total: item.quantity * item.unitPrice, sortOrder: idx })) },
      },
      include: { client: true, items: { orderBy: { sortOrder: 'asc' } } },
    });
    res.status(201).json({ success: true, message: 'Quotation created successfully', data: quotation });
  } catch (error) { next(error); }
};

export const updateQuotation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.quotation.findFirst({ where: { id: req.params.id, ...(req.user?.roleName === 'SALES_CONSULTANT' ? { createdById: req.user.id } : {}) } });
    if (!existing) throw new NotFoundError('Quotation');
    if (existing.status === 'CONVERTED') throw new ValidationError('Cannot edit a converted quotation');

    const { items, discountType, discountValue, taxRate, ...rest } = req.body;
    const { subtotal, discountAmount, taxAmount, grandTotal } = calculateTotals(items, discountType, discountValue, taxRate);

    const quotation = await prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotationId: req.params.id } });
      return tx.quotation.update({
        where: { id: req.params.id },
        data: {
          ...rest, discountType, discountValue, discountAmount, taxRate, taxAmount, subtotal, grandTotal,
          items: { create: items.map((item: any, idx: number) => ({ ...item, total: item.quantity * item.unitPrice, sortOrder: idx })) },
        },
        include: { client: true, items: { orderBy: { sortOrder: 'asc' } } },
      });
    });
    res.json({ success: true, message: 'Quotation updated successfully', data: quotation });
  } catch (error) { next(error); }
};

export const convertQuotationToInvoice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const quotation = await prisma.quotation.findFirst({ where: { id: req.params.id, ...(req.user?.roleName === 'SALES_CONSULTANT' ? { createdById: req.user.id } : {}) }, include: { items: true } }) as any;
    if (!quotation) throw new NotFoundError('Quotation');
    if (quotation.status === 'CONVERTED') throw new ValidationError('Quotation already converted');

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const invoice = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await reserveDocumentNumber(tx, `invoice-${new Date().getFullYear()}`, `INV-${new Date().getFullYear()}`, 4);
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber, clientId: quotation.clientId, invoiceDate: new Date(), dueDate,
          currency: quotation.currency, exchangeRate: quotation.exchangeRate,
          subtotal: quotation.subtotal, discountType: quotation.discountType,
          discountValue: quotation.discountValue, discountAmount: quotation.discountAmount,
          taxRate: quotation.taxRate, taxAmount: quotation.taxAmount,
          grandTotal: quotation.grandTotal, balance: quotation.grandTotal,
          notes: quotation.notes, terms: quotation.terms, status: 'UNPAID',
          quotationId: quotation.id, createdById: req.user!.id,
          items: { create: quotation.items.map((item: any) => ({ description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, total: item.total, sortOrder: item.sortOrder })) },
        },
      });
      await tx.quotation.update({ where: { id: quotation.id }, data: { status: 'CONVERTED', convertedInvoiceId: newInvoice.id } });
      return newInvoice;
    });

    res.status(201).json({ success: true, message: 'Quotation converted to invoice', data: invoice });
  } catch (error) { next(error); }
};

export const duplicateQuotation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const source = await prisma.quotation.findFirst({ where: { id: req.params.id, ...(req.user?.roleName === 'SALES_CONSULTANT' ? { createdById: req.user.id } : {}) }, include: { items: true } }) as any;
    if (!source) throw new NotFoundError('Quotation');
    const quotationNumber = await generateQuotationNumber();
    const { id, createdAt, updatedAt, convertedInvoiceId, ...data } = source as any;
    const quotation = await prisma.quotation.create({
      data: { ...data, quotationNumber, status: 'DRAFT', createdById: req.user!.id, items: { create: source.items.map((item: any) => { const { id: _id, quotationId: _quotationId, ...newItem } = item; return newItem; }) } },
      include: { client: true, items: { orderBy: { sortOrder: 'asc' } } },
    });
    res.status(201).json({ success: true, message: 'Quotation duplicated', data: quotation });
  } catch (error) { next(error); }
};
