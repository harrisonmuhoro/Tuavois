import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/services';
import { formatCurrency } from '../utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Button } from '../components/ui';
import { Link } from 'react-router-dom';

function QuickActions({ permissions = [] as string[] }: { permissions?: string[] }) {
  const actions = [
    ['quotations.create', 'Create quotation', '/quotations'], ['invoices.create', 'Create invoice', '/invoices'],
    ['payments.create', 'Record payment', '/payments'], ['trips.create', 'Create trip', '/trips'],
    ['trips.edit', 'Build itinerary', '/itineraries'],
  ].filter(([permission]) => permissions.includes(permission));
  if (!actions.length) return null;
  return <div className="mb-6 flex flex-wrap gap-2">{actions.map(([permission, label, href]) => <Link key={permission} to={href} className="rounded-lg bg-[#0f4c81] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a3563]">{label}</Link>)}</div>;
}

export function DashboardPage() {
  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await dashboardApi.get()).data,
  });
  const data = dashboard.data?.data;
  const summary = data?.financialSummary;
  
  const revenueData = data?.monthlyRevenue || [];
  const expenseData = data?.monthlyExpenses || [];
  const profitabilityData = Array.from(new Set([...revenueData.map((row) => row.month), ...expenseData.map((row: any) => row.month)])).sort().map((month) => ({ month, revenue: Number(revenueData.find((row) => row.month === month)?.revenue || 0), collected: Number(revenueData.find((row) => row.month === month)?.collected || 0), expenses: Number(expenseData.find((row: any) => row.month === month)?.expenses || 0) }));
  
  const invoiceStatsData = data?.invoiceStats ? Object.entries(data.invoiceStats).map(([status, stat]: any) => ({
    name: status,
    total: stat.total,
    count: stat.count
  })) : [];

  if (data?.role === 'SALES_CONSULTANT') {
    const sales = data.widgets?.salesSummary || {};
    return <div className="p-4 sm:p-6 lg:p-8"><header className="mb-8"><p className="text-sm font-medium text-blue-700">Sales workspace</p><h1 className="text-3xl font-bold tracking-tight">My dashboard</h1><p className="mt-1 text-slate-500">Your prospects, customers, quotations, and assigned work.</p></header><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">{[['My prospects', sales.prospects], ['My clients', sales.clients], ['Invoice value', formatCurrency(sales.invoiceValue)], ['Outstanding', formatCurrency(sales.outstanding)], ['Quotations', (sales.quotations || []).reduce((sum: number, row: any) => sum + Number(row._count?.id || 0), 0)]].map(([label, value]) => <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={String(label)}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-lg sm:text-xl 2xl:text-2xl font-bold break-words">{value}</p></article>)}</div><div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Assigned upcoming trips</h2><div className="mt-4 space-y-3">{(data.widgets?.trips || []).map((trip: any) => <div className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-3" key={trip.id}><span className="font-medium">{trip.name} · {trip.destination}</span><span className="text-sm text-slate-500">{new Date(trip.startDate).toLocaleDateString()} · {trip.status}</span></div>)}{!data.widgets?.trips?.length && <p className="text-sm text-slate-500">No upcoming assigned trips.</p>}</div></div></div>;
  }
  if (data?.role === 'OPERATIONS_STAFF') {
    const operations = data.widgets?.operationsSummary || {};
    return <div className="p-4 sm:p-6 lg:p-8"><header className="mb-8"><p className="text-sm font-medium text-blue-700">Operations workspace</p><h1 className="text-3xl font-bold tracking-tight">Today's operations</h1><p className="mt-1 text-slate-500">Trips, participants, and operational readiness assigned to you.</p></header><div className="grid gap-4 sm:grid-cols-3">{[['Trips today', operations.tripsToday], ['Upcoming trips', operations.upcomingTrips], ['Participants travelling', operations.participants]].map(([label, value]) => <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={String(label)}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-lg sm:text-xl 2xl:text-2xl font-bold break-words">{value}</p></article>)}</div><div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Operational trips</h2><div className="mt-4 space-y-3">{(data.widgets?.trips || []).map((trip: any) => <div className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-3" key={trip.id}><span className="font-medium">{trip.name} · {trip.client?.fullName}</span><span className="text-sm text-slate-500">{trip._count?.participants || 0} participants · {trip._count?.vouchers || 0} vouchers</span></div>)}</div></div></div>;
  }
  if (data?.role === 'ACCOUNTANT') {
    const finance = data.widgets?.accountantSummary || {};
    return <div className="p-4 sm:p-6 lg:p-8"><header className="mb-8"><p className="text-sm font-medium text-blue-700">Finance workspace</p><h1 className="text-3xl font-bold tracking-tight">Accountant dashboard</h1><p className="mt-1 text-slate-500">Receivables, collections, receipts, and credit-note controls.</p></header><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">{[['Invoice value', formatCurrency(finance.invoiceValue)], ['Paid', formatCurrency(finance.paid)], ['Outstanding', formatCurrency(finance.outstanding)], ['Overdue', formatCurrency(finance.overdue)], ['Receipts', finance.receipts]].map(([label, value]) => <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={String(label)}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-lg sm:text-xl 2xl:text-2xl font-bold break-words">{value}</p></article>)}</div><div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Collection position</h2><div className="mt-4 space-y-3 text-sm"><p className="flex justify-between"><span>Payments received</span><strong>{formatCurrency(finance.paymentsReceived)}</strong></p><p className="flex justify-between"><span>Payment entries</span><strong>{finance.paymentCount}</strong></p><p className="flex justify-between"><span>Overdue invoices</span><strong>{finance.overdueCount}</strong></p><p className="flex justify-between"><span>Credit notes issued</span><strong>{finance.creditNoteCount} · {formatCurrency(finance.creditNotes)}</strong></p></div></section><section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Payments by method</h2><div className="mt-4 space-y-3">{(finance.paymentMethods || []).map((method: any) => <p className="flex justify-between text-sm" key={method.paymentMethod}><span>{method.paymentMethod}</span><strong>{formatCurrency(Number(method._sum?.amount || 0))} · {method._count?.id || 0}</strong></p>)}{!finance.paymentMethods?.length && <p className="text-sm text-slate-500">No payments recorded yet.</p>}</div></section></div></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-700">Overview</p>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-slate-500">Your travel operations at a glance.</p>
        </div>
        
      </header>

      {dashboard.isLoading && <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">Loading dashboard…</div>}
      {dashboard.isError && <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-6 text-red-700" role="alert"><span>Unable to load dashboard data. Check that the API is running.</span><Button size="sm" variant="outline" onClick={() => dashboard.refetch()}>Retry</Button></div>}
      {data && <QuickActions permissions={data.permissions} />}
      {summary && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            {[
              ['Invoice value', summary.totalInvoiceValue],
              ['Paid', summary.totalPaid],
              ['Outstanding', summary.totalOutstanding],
              ['Collected this month', summary.monthlyCollected],
              ['Overdue invoices', summary.overdueCount],
            ].map(([label, value]) => (
              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={label}>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 text-lg sm:text-xl 2xl:text-2xl font-bold break-words">{label === 'Overdue invoices' ? value : formatCurrency(Number(value))}</p>
                {label === 'Collected this month' && <p className={`mt-2 text-xs font-medium ${Number(summary.monthlyCollectedChangePercent) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{Number(summary.monthlyCollectedChangePercent) >= 0 ? '+' : ''}{Number(summary.monthlyCollectedChangePercent).toFixed(1)}% vs previous month</p>}
              </article>
            ))}
          </div>

          {data.ownerFinancials && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Estimated profit</p><p className="mt-2 text-lg sm:text-xl 2xl:text-2xl font-bold break-words">{formatCurrency(data.ownerFinancials.estimatedProfit)}</p><p className="mt-1 text-xs text-slate-500">Revenue less estimated cost</p></article><article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Actual profit</p><p className="mt-2 text-lg sm:text-xl 2xl:text-2xl font-bold break-words">{formatCurrency(data.ownerFinancials.actualProfit)}</p><p className="mt-1 text-xs text-slate-500">Recorded revenue less actual cost</p></article><article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Trip expenses</p><p className="mt-2 text-lg sm:text-xl 2xl:text-2xl font-bold break-words">{formatCurrency(data.ownerFinancials.expenses)}</p><p className="mt-1 text-xs text-slate-500">{data.ownerFinancials.expenseCount} expense entries</p></article><article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Actual margin</p><p className="mt-2 text-lg sm:text-xl 2xl:text-2xl font-bold break-words">{data.ownerFinancials.actualRevenue ? `${((data.ownerFinancials.actualProfit / data.ownerFinancials.actualRevenue) * 100).toFixed(1)}%` : '—'}</p><p className="mt-1 text-xs text-slate-500">Based on recorded trip figures</p></article></div>}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-6">Revenue Trend (Last 12 Months)</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(val) => `$${val}`} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Invoiced" stroke="#0f4c81" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="collected" name="Collected" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-6">Invoices by Status</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={invoiceStatsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(val) => `$${val}`} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                    <Legend />
                    <Bar dataKey="total" name="Total Value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          {profitabilityData.length > 0 && <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold mb-6">Revenue and expense trend</h2><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={profitabilityData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis tickFormatter={(val) => `$${val}`} tick={{ fontSize: 12 }} /><Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} /><Legend /><Line type="monotone" dataKey="revenue" name="Invoiced" stroke="#0f4c81" strokeWidth={2} /><Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} /><Line type="monotone" dataKey="collected" name="Collected" stroke="#10b981" strokeWidth={2} /></LineChart></ResponsiveContainer></div></div>}
        </div>
      )}
    </div>
  );
}
