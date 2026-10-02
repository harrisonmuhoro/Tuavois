import prisma from '../config/database';

/** Marks newly overdue invoices and creates one notification per invoice. */
export const processOverdueInvoices = async (): Promise<number> => {
  const now = new Date();
  const candidates = await prisma.invoice.findMany({
    where: { status: { in: ['UNPAID', 'PARTIALLY_PAID'] }, dueDate: { lt: now } },
    select: { id: true, invoiceNumber: true, dueDate: true, createdById: true, companyId: true },
  });
  if (!candidates.length) return 0;

  const marked = await prisma.invoice.updateMany({ where: { id: { in: candidates.map((invoice) => invoice.id) }, status: { in: ['UNPAID', 'PARTIALLY_PAID'] } }, data: { status: 'OVERDUE' } });
  for (const invoice of candidates) {
    if (!invoice.createdById) continue;
    const existing = await prisma.notification.findFirst({ where: { companyId: invoice.companyId, userId: invoice.createdById, entityType: 'Invoice', entityId: invoice.id, type: 'INVOICE', title: 'Invoice overdue' } });
    if (!existing) await prisma.notification.create({ data: { companyId: invoice.companyId, userId: invoice.createdById, title: 'Invoice overdue', message: `Invoice ${invoice.invoiceNumber} passed its due date on ${invoice.dueDate.toLocaleDateString()}.`, type: 'INVOICE', entityType: 'Invoice', entityId: invoice.id } });
  }
  return marked.count;
};
