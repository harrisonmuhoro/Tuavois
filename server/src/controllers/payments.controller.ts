import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotFoundError, ValidationError } from '../utils/errors';
import { reserveDocumentNumber } from '../utils/sequences';
import { runSerializableTransaction } from '../utils/transactions';
import { paginationMeta, parsePagination } from '../utils/pagination';
import { tenantScope } from '../utils/tenant';

export const determineInvoiceStatus = (balance: number, grandTotal: number): string => {
  if (balance <= 0) return 'PAID';
  if (balance < grandTotal) return 'PARTIALLY_PAID';
  return 'UNPAID';
};

export const getPayments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { search = '', clientId, invoiceId, paymentMethod, dateFrom, dateTo } = req.query as Record<string, string>;

    const where: any = { ...tenantScope(req) };
    if (search) where.OR = [{ paymentNumber: { contains: search } }, { reference: { contains: search } }];
    if (clientId) where.clientId = clientId;
    if (invoiceId) where.invoiceId = invoiceId;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (dateFrom || dateTo) where.paymentDate = { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined };
    if (req.user?.roleName === 'SALES_CONSULTANT') where.invoice = { createdById: req.user.id };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where, skip, take: limit,
        orderBy: { paymentDate: 'desc' },
        include: { client: { select: { id: true, fullName: true } }, invoice: { select: { id: true, invoiceNumber: true } }, receivedBy: { select: { id: true, name: true } }, receipt: true },
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({ success: true, data: payments, pagination: paginationMeta({ page, limit, skip }, total) });
  } catch (error) { next(error); }
};

export const createPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { invoiceId, amount, currency, exchangeRate = 1, paymentMethod, paymentDate, reference, notes } = req.body;

    // Use a transaction for atomicity
    const result = await runSerializableTransaction(prisma, async (tx) => {
      // 1. Fetch invoice
      const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, ...tenantScope(req), ...(req.user?.roleName === 'SALES_CONSULTANT' ? { createdById: req.user.id } : {}) } });
      if (!invoice) throw new NotFoundError('Invoice');
      if (invoice.status === 'CANCELLED') throw new ValidationError('Cannot pay a cancelled invoice');
      if (invoice.status === 'PAID') throw new ValidationError('Invoice is already fully paid');

      // 2. Check overpayment
      const currentBalance = Number(invoice.balance);
      if (amount > currentBalance) throw new ValidationError(`Amount (${amount}) exceeds outstanding balance (${currentBalance})`);

      // 3. Create payment
      const paymentNumber = await reserveDocumentNumber(tx, `payment-${new Date().getFullYear()}`, `PAY-${new Date().getFullYear()}`, 5, req.companyId);
      const baseAmount = amount * exchangeRate;
      const payment = await tx.payment.create({
        data: {
          paymentNumber, invoiceId, clientId: invoice.clientId, amount, currency, exchangeRate, baseAmount,
          paymentMethod, paymentDate: new Date(paymentDate), reference, notes,
          receivedById: req.user!.id, companyId: req.user!.companyId,
        },
      });

      // 4. Update invoice balance & status
      const newAmountPaid = Number(invoice.amountPaid) + amount;
      const newBalance = Number(invoice.grandTotal) - newAmountPaid - Number(invoice.creditApplied);
      const newStatus = determineInvoiceStatus(newBalance, Number(invoice.grandTotal));
      await tx.invoice.update({ where: { id: invoiceId }, data: { amountPaid: newAmountPaid, balance: newBalance, status: newStatus as any } });

      // 5. Create receipt
      const receiptNumber = await reserveDocumentNumber(tx, `receipt-${new Date().getFullYear()}`, `RCT-${new Date().getFullYear()}`, 5, req.companyId);
      const receipt = await tx.receipt.create({
        data: { receiptNumber, paymentId: payment.id, invoiceId, amount, currency, balanceAfter: newBalance, companyId: req.user!.companyId },
      });

      // 6. Create audit log
      await tx.auditLog.create({ data: { userId: req.user!.id, companyId: req.companyId, action: 'PAYMENT', entity: 'Payment', entityId: payment.id } });

      // 7. Create notification
      await tx.notification.create({
        data: { companyId: req.companyId, userId: req.user!.id, title: 'Payment Received', message: `Payment of ${currency} ${amount.toLocaleString()} received for invoice ${invoice.invoiceNumber}`, type: 'PAYMENT', entityType: 'Payment', entityId: payment.id },
      });

      return { payment, receipt };
    });

    res.status(201).json({ success: true, message: 'Payment recorded successfully', data: result });
  } catch (error) { next(error); }
};

export const getReceipts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { invoiceId, clientId } = req.query as Record<string, string>;
    const where: any = { ...tenantScope(req) };
    if (invoiceId) where.invoiceId = invoiceId;
    if (clientId) where.invoice = { clientId };
    if (req.user?.roleName === 'SALES_CONSULTANT') where.invoice = { ...(where.invoice || {}), createdById: req.user.id };

    const [receipts, total] = await Promise.all([
      prisma.receipt.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { payment: { include: { client: { select: { id: true, fullName: true } }, receivedBy: { select: { id: true, name: true } } } }, invoice: { select: { id: true, invoiceNumber: true } } },
      }),
      prisma.receipt.count({ where }),
    ]);

    res.json({ success: true, data: receipts, pagination: paginationMeta({ page, limit, skip }, total) });
  } catch (error) { next(error); }
};
