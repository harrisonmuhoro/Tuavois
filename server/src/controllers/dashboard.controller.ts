import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotFoundError } from '../utils/errors';
import { processOverdueInvoices } from '../utils/overdue-invoices';
import { tenantScope } from '../utils/tenant';

const dashboardRole = (req: AuthRequest): 'ADMIN' | 'SALES_CONSULTANT' | 'OPERATIONS_STAFF' | 'ACCOUNTANT' | 'STAFF' => {
  if (req.user?.roleName === 'ADMIN') return 'ADMIN';
  if (['SALES_CONSULTANT', 'OPERATIONS_STAFF', 'ACCOUNTANT'].includes(req.user?.roleName || '')) return req.user!.roleName as any;
  const department = (req.user?.department || '').toLowerCase();
  if (department.includes('sales')) return 'SALES_CONSULTANT';
  if (department.includes('operation')) return 'OPERATIONS_STAFF';
  if (department.includes('account') || department.includes('finance')) return 'ACCOUNTANT';
  return 'STAFF';
};

const getScopedDashboard = async (req: AuthRequest, role: ReturnType<typeof dashboardRole>) => {
  const userId = req.user!.id;
  const now = new Date();
  const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const scope = tenantScope(req);

  if (role === 'SALES_CONSULTANT') {
    const [prospects, quotations, invoices, clients, trips] = await Promise.all([
      prisma.prospect.count({ where: { assignedStaffId: userId, status: { notIn: ['WON', 'LOST'] }, ...scope } }),
      prisma.quotation.groupBy({ by: ['status'], where: { createdById: userId, ...scope }, _count: { id: true }, _sum: { grandTotal: true } }),
      prisma.invoice.aggregate({ where: { createdById: userId, ...scope }, _sum: { grandTotal: true, balance: true }, _count: { id: true } }),
      prisma.client.count({ where: { assignedStaffId: userId, ...scope } }),
      prisma.trip.findMany({ where: { assignedStaffId: userId, startDate: { gte: now, lte: horizon }, status: { in: ['PLANNED', 'CONFIRMED'] }, ...scope }, select: { id: true, name: true, destination: true, startDate: true, status: true }, orderBy: { startDate: 'asc' }, take: 8 }),
    ]);
    return { role, permissions: req.user!.permissions, widgets: { salesSummary: { prospects, quotations, invoiceValue: Number(invoices._sum.grandTotal || 0), outstanding: Number(invoices._sum.balance || 0), clients }, quotations, trips } };
  }
  if (role === 'OPERATIONS_STAFF') {
    const trips = await prisma.trip.findMany({ where: { assignedStaffId: userId, startDate: { lte: horizon }, endDate: { gte: now }, status: { not: 'CANCELLED' }, ...scope }, include: { client: { select: { fullName: true } }, _count: { select: { participants: true, expenses: true, itineraries: true, vouchers: true } } }, orderBy: { startDate: 'asc' }, take: 20 });
    return { role, permissions: req.user!.permissions, widgets: { operationsSummary: { tripsToday: trips.filter((trip) => trip.startDate.toDateString() === now.toDateString()).length, upcomingTrips: trips.length, participants: trips.reduce((sum, trip) => sum + trip._count.participants, 0) }, trips } };
  }
  if (role === 'ACCOUNTANT') {
    const [receivables, paymentTotals, paymentMethods, receipts, creditNotes] = await Promise.all([
      prisma.invoice.aggregate({ where: { status: { not: 'CANCELLED' }, ...scope }, _sum: { grandTotal: true, amountPaid: true, balance: true } }),
      prisma.payment.aggregate({ where: scope, _sum: { amount: true, baseAmount: true }, _count: { id: true } }),
      prisma.payment.groupBy({ by: ['paymentMethod'], where: scope, _sum: { amount: true }, _count: { id: true } }),
      prisma.receipt.count({ where: scope }),
      prisma.creditNote.aggregate({ where: { status: { not: 'VOIDED' }, ...scope }, _sum: { amount: true, amountApplied: true }, _count: { id: true } }),
    ]);
    const overdue = await prisma.invoice.aggregate({ where: { status: { in: ['UNPAID', 'PARTIALLY_PAID'] }, dueDate: { lt: now }, ...scope }, _sum: { balance: true }, _count: { id: true } });
    return { role, permissions: req.user!.permissions, widgets: { accountantSummary: { invoiceValue: Number(receivables._sum.grandTotal || 0), paid: Number(receivables._sum.amountPaid || 0), outstanding: Number(receivables._sum.balance || 0), overdue: Number(overdue._sum.balance || 0), overdueCount: overdue._count.id, paymentsReceived: Number(paymentTotals._sum.amount || 0), paymentCount: paymentTotals._count.id, receipts, creditNotes: Number(creditNotes._sum.amount || 0), creditNoteCount: creditNotes._count.id, appliedCreditNotes: Number(creditNotes._sum.amountApplied || 0), paymentMethods } } };
  }
  return null;
};

export const getDashboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = dashboardRole(req);
    const scoped = await getScopedDashboard(req, role);
    if (scoped) { res.json({ success: true, data: scoped }); return; }
    await processOverdueInvoices();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const companyId = req.user?.companyId ?? null;
    const scope = tenantScope(req);

    // Parallel aggregations
    const [
      invoiceStats, paymentStats, previousPaymentStats, tripStats, overdueInvoices,
      recentPayments, recentQuotations, upcomingTrips,
      monthlyRevenue, monthlyExpenses, clientCount, prospectCount, tripFinancials, expenseSummary,
    ] = await Promise.all([
      // Invoice totals by status
      prisma.invoice.groupBy({
        by: ['status'],
        where: scope,
        _sum: { grandTotal: true, amountPaid: true, balance: true },
        _count: { id: true },
      }),
      // Payment stats for this month
      prisma.payment.aggregate({ where: { paymentDate: { gte: startOfMonth, lte: endOfMonth }, ...scope }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { paymentDate: { gte: startOfPreviousMonth, lte: endOfPreviousMonth }, ...scope }, _sum: { amount: true } }),
      // Trip stats by status
      prisma.trip.groupBy({ by: ['status'], where: scope, _count: { id: true } }),
      // Overdue invoices
      prisma.invoice.findMany({
        where: { status: { in: ['UNPAID', 'PARTIALLY_PAID'] }, dueDate: { lt: now }, ...scope },
        include: { client: { select: { id: true, fullName: true } } },
        orderBy: { dueDate: 'asc' }, take: 5,
      }),
      // Recent payments
      prisma.payment.findMany({
        where: scope,
        orderBy: { createdAt: 'desc' }, take: 5,
        include: { client: { select: { id: true, fullName: true } }, invoice: { select: { invoiceNumber: true } } },
      }),
      // Recent quotations
      prisma.quotation.findMany({
        where: scope,
        orderBy: { createdAt: 'desc' }, take: 5,
        include: { client: { select: { id: true, fullName: true } } },
      }),
      // Upcoming trips (next 30 days)
      prisma.trip.findMany({
        where: { startDate: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) }, status: { in: ['PLANNED', 'CONFIRMED'] }, ...scope },
        include: { client: { select: { id: true, fullName: true } } },
        orderBy: { startDate: 'asc' }, take: 5,
      }),
      // Monthly revenue (last 12 months)
      prisma.$queryRaw`
        SELECT DATE_FORMAT(invoiceDate, '%Y-%m') as month, 
               SUM(grandTotal) as revenue, 
               SUM(amountPaid) as collected
        FROM invoices 
        WHERE invoiceDate >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
          AND status != 'CANCELLED'
          AND (${companyId} IS NULL OR companyId = ${companyId})
        GROUP BY month ORDER BY month ASC
      `,
      prisma.$queryRaw`
        SELECT DATE_FORMAT(date, '%Y-%m') as month,
               SUM(amount) as expenses
        FROM trip_expenses
        WHERE date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
          AND (${companyId} IS NULL OR companyId = ${companyId})
        GROUP BY month ORDER BY month ASC
      `,
      prisma.client.count({ where: scope }),
      prisma.prospect.count({ where: { status: { notIn: ['WON', 'LOST'] }, ...scope } }),
      prisma.trip.aggregate({ where: { status: { not: 'CANCELLED' }, ...scope }, _sum: { estimatedRevenue: true, estimatedCost: true, actualRevenue: true, actualCost: true } }),
      prisma.tripExpense.aggregate({ where: scope, _sum: { amount: true, baseAmount: true }, _count: { id: true } }),
    ]);

    // Compute financial summary
    const totalInvoiceValue = invoiceStats.reduce((s, i) => s + Number(i._sum.grandTotal || 0), 0);
    const totalPaid = invoiceStats.reduce((s, i) => s + Number(i._sum.amountPaid || 0), 0);
    const totalOutstanding = invoiceStats.filter(i => i.status !== 'CANCELLED').reduce((s, i) => s + Number(i._sum.balance || 0), 0);
    const overdueCount = invoiceStats.find(i => i.status === 'OVERDUE')?._count.id || 0;
    const monthlyCollected = Number(paymentStats._sum.amount || 0);
    const previousMonthlyCollected = Number(previousPaymentStats._sum.amount || 0);
    const monthlyCollectedChangePercent = previousMonthlyCollected === 0
      ? (monthlyCollected === 0 ? 0 : 100)
      : ((monthlyCollected - previousMonthlyCollected) / previousMonthlyCollected) * 100;

    res.json({
      success: true,
      data: {
        role,
        permissions: req.user!.permissions,
        financialSummary: { totalInvoiceValue, totalPaid, totalOutstanding, overdueCount, monthlyCollected, previousMonthlyCollected, monthlyCollectedChangePercent },
        invoiceStats: invoiceStats.reduce((acc: any, item) => { acc[item.status] = { count: item._count.id, total: Number(item._sum.grandTotal || 0) }; return acc; }, {}),
        tripStats: tripStats.reduce((acc: any, item) => { acc[item.status] = item._count.id; return acc; }, {}),
        clientCount, prospectCount,
        overdueInvoices, recentPayments, recentQuotations, upcomingTrips,
        monthlyRevenue,
        monthlyExpenses,
        ownerFinancials: { estimatedRevenue: Number(tripFinancials._sum.estimatedRevenue || 0), estimatedCost: Number(tripFinancials._sum.estimatedCost || 0), actualRevenue: Number(tripFinancials._sum.actualRevenue || 0), actualCost: Number(tripFinancials._sum.actualCost || 0), estimatedProfit: Number(tripFinancials._sum.estimatedRevenue || 0) - Number(tripFinancials._sum.estimatedCost || 0), actualProfit: Number(tripFinancials._sum.actualRevenue || 0) - Number(tripFinancials._sum.actualCost || 0), expenses: Number(expenseSummary._sum.amount || 0), expenseCount: expenseSummary._count.id },
      },
    });
  } catch (error) { next(error); }
};
