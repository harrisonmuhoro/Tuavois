import { NextFunction, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotFoundError, ValidationError } from '../utils/errors';
import { reserveDocumentNumber } from '../utils/sequences';
import { runSerializableTransaction } from '../utils/transactions';
import { paginationMeta, parsePagination } from '../utils/pagination';

export const getCreditNotes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { search = '', status } = req.query as Record<string, string>;
    const where: any = { ...(status ? { status } : {}) };
    if (search) where.OR = [{ creditNoteNumber: { contains: search } }, { invoice: { invoiceNumber: { contains: search } } }, { client: { fullName: { contains: search } } }];
    const [data, total] = await Promise.all([
      prisma.creditNote.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { invoice: { select: { invoiceNumber: true } }, client: { select: { fullName: true } }, items: true } }),
      prisma.creditNote.count({ where }),
    ]);
    res.json({ success: true, data, pagination: paginationMeta({ page, limit, skip }, total) });
  } catch (error) { next(error); }
};

export const createCreditNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { invoiceId, amount, currency = 'KES', reason, items = [] } = req.body;
    const creditNote = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) throw new NotFoundError('Invoice');
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) throw new ValidationError('Credit amount must be greater than zero');
      if (value > Number(invoice.balance)) throw new ValidationError('Credit amount cannot exceed the invoice balance');
      const creditNoteNumber = await reserveDocumentNumber(tx, `credit-note-${new Date().getFullYear()}`, `CN-${new Date().getFullYear()}`, 4);
      return tx.creditNote.create({ data: { creditNoteNumber, invoiceId, clientId: invoice.clientId, amount: value, currency, reason, items: { create: items.map((item: any) => ({ description: item.description, quantity: item.quantity || 1, unitPrice: item.unitPrice || item.total || 0, total: item.total || item.quantity * item.unitPrice || 0 })) } }, include: { invoice: true, client: true, items: true } });
    });
    res.status(201).json({ success: true, message: 'Credit note created successfully', data: creditNote });
  } catch (error) { next(error); }
};

export const applyCreditNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await runSerializableTransaction(prisma, async (tx) => {
      const note = await tx.creditNote.findUnique({ where: { id: req.params.id }, include: { invoice: true } });
      if (!note) throw new NotFoundError('Credit note');
      if (note.status !== 'ISSUED') throw new ValidationError('Only issued credit notes can be applied');
      const remaining = Number(note.amount) - Number(note.amountApplied);
      const amount = req.body.amount === undefined ? remaining : Number(req.body.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) throw new ValidationError('Application amount must not exceed the unapplied credit balance');
      if (amount > Number(note.invoice.balance)) throw new ValidationError('Credit note exceeds the current invoice balance');
      const nextApplied = Number(note.amountApplied) + amount;
      const invoice = await tx.invoice.update({ where: { id: note.invoiceId }, data: { creditApplied: { increment: amount }, balance: { decrement: amount }, status: amount === Number(note.invoice.balance) ? 'PAID' : note.invoice.status } });
      const updated = await tx.creditNote.update({ where: { id: note.id }, data: { status: nextApplied === Number(note.amount) ? 'APPLIED' : 'ISSUED', amountApplied: nextApplied } });
      await tx.auditLog.create({ data: { userId: req.user!.id, action: 'CREDIT_NOTE_APPLIED', entity: 'CreditNote', entityId: note.id } });
      return { note: updated, invoice };
    });
    res.json({ success: true, message: 'Credit note applied successfully', data: result });
  } catch (error) { next(error); }
};

export const voidCreditNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const note = await prisma.$transaction(async (tx) => {
      const current = await tx.creditNote.findUnique({ where: { id: req.params.id } });
      if (!current) throw new NotFoundError('Credit note');
      if (current.status !== 'ISSUED' || Number(current.amountApplied) !== 0) throw new ValidationError('Only unapplied issued credit notes can be voided');
      const updated = await tx.creditNote.update({ where: { id: current.id }, data: { status: 'VOIDED' } });
      await tx.auditLog.create({ data: { userId: req.user!.id, action: 'CREDIT_NOTE_VOIDED', entity: 'CreditNote', entityId: current.id } });
      return updated;
    });
    res.json({ success: true, message: 'Credit note voided successfully', data: note });
  } catch (error) { next(error); }
};
