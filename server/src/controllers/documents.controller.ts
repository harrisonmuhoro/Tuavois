import PDFDocument from 'pdfkit';
import { Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors';
import { assertTenantRecord, tenantScope } from '../utils/tenant';

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] || character));
const money = (value: unknown, currency = 'KES') => `${currency} ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

const htmlToText = (html: string) => html
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|div|h1|h2|tr|header)>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/[ \t]+/g, ' ')
  .replace(/\n\s*\n\s*\n/g, '\n\n')
  .trim();

const renderPdf = async (res: Response, title: string, body: string, brand?: { name?: string | null; logoUrl?: string | null } | null): Promise<void> => {
  const document = new PDFDocument({ size: 'A4', margin: 48, info: { Title: title, Author: brand?.name || 'Travel ERP' } });
  res.type('application/pdf').set('Content-Disposition', `inline; filename="${title}.pdf"`);
  document.pipe(res);
  if (brand?.logoUrl && !/^https?:\/\//i.test(brand.logoUrl)) {
    const logoPath = path.resolve(process.cwd(), brand.logoUrl.replace(/^\/+/, ''));
    try {
      await fs.access(logoPath);
      document.image(logoPath, 48, 42, { fit: [56, 56] });
      document.x = 116;
    } catch { /* A missing optional logo must not prevent document generation. */ }
  }
  document.fillColor('#0f4c81').fontSize(22).font('Helvetica-Bold').text(title);
  document.moveDown(0.8).fillColor('#172033').fontSize(10).font('Helvetica').text(htmlToText(body), { lineGap: 5 });
  document.end();
};

const company = async (companyId: string | null | undefined) => companyId ? prisma.company.findUnique({ where: { id: companyId } }) : null;

export const invoicePdf = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [invoice, settings] = await Promise.all([prisma.invoice.findFirst({ where: { id: req.params.id, ...tenantScope(req) }, include: { client: true, items: { orderBy: { sortOrder: 'asc' } }, payments: true } }), company(req.user?.companyId)]);
    if (!invoice) throw new NotFoundError('Invoice');
    const rows = invoice.items.map((item) => `<tr><td>${escapeHtml(item.description)}</td><td>${item.quantity}</td><td>${money(item.unitPrice, invoice.currency)}</td><td>${money(item.total, invoice.currency)}</td></tr>`).join('');
    await renderPdf(res, invoice.invoiceNumber, `<header><div><h1>${escapeHtml(settings?.name || 'Travel ERP')}</h1><div class="muted">${escapeHtml(settings?.address)}<br>${escapeHtml(settings?.email)} · ${escapeHtml(settings?.phone)}</div></div><div><h2>INVOICE</h2><div>${escapeHtml(invoice.invoiceNumber)}</div><div class="muted">Due ${invoice.dueDate.toLocaleDateString()}</div></div></header><h2>Bill to</h2><p>${escapeHtml(invoice.client.fullName)}<br>${escapeHtml(invoice.client.email)}<br>${escapeHtml(invoice.client.phone)}</p><table><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Grand total: ${money(invoice.grandTotal, invoice.currency)}<br><span class="muted">Balance: ${money(invoice.balance, invoice.currency)}</span></p>`, settings);
  } catch (error) { next(error); }
};

export const quotationPdf = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [quotation, settings] = await Promise.all([prisma.quotation.findFirst({ where: { id: req.params.id, ...tenantScope(req) }, include: { client: true, items: { orderBy: { sortOrder: 'asc' } } } }), company(req.user?.companyId)]);
    if (!quotation) throw new NotFoundError('Quotation');
    const rows = quotation.items.map((item) => `<tr><td>${escapeHtml(item.description)}</td><td>${item.quantity}</td><td>${money(item.unitPrice, quotation.currency)}</td><td>${money(item.total, quotation.currency)}</td></tr>`).join('');
    await renderPdf(res, quotation.quotationNumber, `<header><div><h1>${escapeHtml(settings?.name || 'Travel ERP')}</h1><div class="muted">${escapeHtml(settings?.address)}<br>${escapeHtml(settings?.email)} · ${escapeHtml(settings?.phone)}</div></div><div><h2>QUOTATION</h2><div>${escapeHtml(quotation.quotationNumber)}</div></div></header><h2>Prepared for</h2><p>${escapeHtml(quotation.client.fullName)}<br>${escapeHtml(quotation.destination)}</p><table><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Grand total: ${money(quotation.grandTotal, quotation.currency)}</p>`, settings);
  } catch (error) { next(error); }
};

export const receiptPdf = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [receipt, settings] = await Promise.all([prisma.receipt.findFirst({ where: { id: req.params.id, ...tenantScope(req) }, include: { payment: { include: { client: true, receivedBy: true } }, invoice: true } }), company(req.user?.companyId)]);
    if (!receipt) throw new NotFoundError('Receipt');
    await renderPdf(res, receipt.receiptNumber, `<header><div><h1>${escapeHtml(settings?.name || 'Travel ERP')}</h1><div class="muted">${escapeHtml(settings?.address)}<br>${escapeHtml(settings?.email)} · ${escapeHtml(settings?.phone)}</div></div><div><h2>RECEIPT</h2><div>${escapeHtml(receipt.receiptNumber)}</div></div></header><p>Received from <strong>${escapeHtml(receipt.payment.client.fullName)}</strong> for invoice <strong>${escapeHtml(receipt.invoice.invoiceNumber)}</strong>.</p><p class="total">Amount received: ${money(receipt.amount, receipt.currency)}<br><span class="muted">Remaining balance: ${money(receipt.balanceAfter, receipt.currency)}</span></p><p class="muted">Payment method: ${escapeHtml(receipt.payment.paymentMethod)}<br>Reference: ${escapeHtml(receipt.payment.reference)}<br>Received by: ${escapeHtml(receipt.payment.receivedBy?.name)}</p>`, settings);
  } catch (error) { next(error); }
};

export const uploadDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }
    const { clientId, tripId, invoiceId, quotationId } = req.body;
    const links = [clientId, tripId, invoiceId, quotationId].filter(Boolean);
    if (links.length !== 1) throw new ValidationError('Attach the document to exactly one supported record');
    await assertTenantRecord(prisma, 'client', clientId, req.companyId!, 'Client');
    await assertTenantRecord(prisma, 'trip', tripId, req.companyId!, 'Trip');
    await assertTenantRecord(prisma, 'invoice', invoiceId, req.companyId!, 'Invoice');
    await assertTenantRecord(prisma, 'quotation', quotationId, req.companyId!, 'Quotation');
    if (!canAccessDocument(req, { clientId: clientId || null, tripId: tripId || null, invoiceId: invoiceId || null, quotationId: quotationId || null }, 'edit')) throw new ForbiddenError('Insufficient permission to upload this document');
    
    const url = `/uploads/${req.file.filename}`;
    
    const doc = await prisma.document.create({
      data: {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url,
        clientId: clientId || null,
        tripId: tripId || null,
        invoiceId: invoiceId || null,
        quotationId: quotationId || null,
        uploadedById: req.user?.id,
        companyId: req.user?.companyId,
      }
    });
    
    res.status(201).json({ success: true, data: doc });
  } catch (error) { next(error); }
};

const uploadDirectory = () => path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));

const canAccessDocument = (req: AuthRequest, document: { clientId: string | null; tripId: string | null; invoiceId: string | null; quotationId: string | null }, action: 'view' | 'edit') => {
  if (req.user?.roleName === 'ADMIN') return true;
  const suffix = action === 'view' ? '.view' : '.edit';
  const permissions = req.user?.permissions || [];
  return (document.clientId && permissions.includes(`clients${suffix}`)) || (document.tripId && permissions.includes(`trips${suffix}`)) || (document.invoiceId && permissions.includes(`invoices${suffix}`)) || (document.quotationId && permissions.includes(`quotations${suffix}`));
};

export const listDocuments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { clientId, tripId, invoiceId, quotationId } = req.query as Record<string, string>;
    const link = { clientId: clientId || null, tripId: tripId || null, invoiceId: invoiceId || null, quotationId: quotationId || null };
    if (Object.values(link).filter(Boolean).length !== 1) throw new ValidationError('Specify exactly one supported record');
    if (!canAccessDocument(req, link, 'view')) throw new ForbiddenError('Insufficient permission to view these documents');
    const documents = await prisma.document.findMany({ where: { ...link, ...tenantScope(req) }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: documents });
  } catch (error) { next(error); }
};

export const downloadDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const document = await prisma.document.findFirst({ where: { id: req.params.id, ...tenantScope(req) }, select: { id: true, fileName: true, originalName: true, clientId: true, tripId: true, invoiceId: true, quotationId: true } });
    if (!document) throw new NotFoundError('Document');
    if (!canAccessDocument(req, document, 'view')) throw new ForbiddenError('Insufficient permission to download this document');
    res.download(path.join(uploadDirectory(), document.fileName), document.originalName);
  } catch (error) { next(error); }
};

export const deleteDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const document = await prisma.document.findFirst({ where: { id: req.params.id, ...tenantScope(req) }, select: { id: true, fileName: true, originalName: true, clientId: true, tripId: true, invoiceId: true, quotationId: true } });
    if (!document) throw new NotFoundError('Document');
    if (!canAccessDocument(req, document, 'edit')) throw new ForbiddenError('Insufficient permission to delete this document');
    await prisma.document.delete({ where: { id: document.id } });
    await fs.unlink(path.join(uploadDirectory(), document.fileName)).catch(() => undefined);
    res.json({ success: true, message: 'Document deleted successfully', data: null });
  } catch (error) { next(error); }
};
