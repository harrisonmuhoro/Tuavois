import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AppLayout } from './layouts/AppLayout';
import { ClientsPage } from './pages/ClientsPage';
import { ProspectsPage } from './pages/ProspectsPage';
import { QuotationsPage } from './pages/QuotationsPage';
import { QuotationDetailsPage } from './pages/QuotationDetailsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { InvoiceDetailsPage } from './pages/InvoiceDetailsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ReceiptsPage } from './pages/ReceiptsPage';
import { TripsPage } from './pages/TripsPage';
import { ItinerariesPage } from './pages/ItinerariesPage';
import { VouchersPage } from './pages/VouchersPage';
import { VoucherOperationsPage } from './pages/VoucherOperationsPage';
import { LettersPage } from './pages/LettersPage';
import { ItineraryTemplatesPage } from './pages/ItineraryTemplatesPage';
import { QuotationReportPage } from './pages/QuotationReportPage';
import { ReportsPage } from './pages/ReportsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { StaffPage } from './pages/StaffPage';
import { CompanySettingsPage } from './pages/CompanySettingsPage';
import { CreditNotesPage } from './pages/CreditNotesPage';
import { ClientProfilePage } from './pages/ClientProfilePage';
import { Button } from './components/ui';

function ProtectedRoutes() {
  const { auth, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!auth) return <Navigate to="/login" replace />;

  const protectedAreas = [
    ['/dashboard', 'dashboard.view'], ['/clients', 'clients.view'], ['/prospects', 'prospects.view'],
    ['/quotations', 'quotations.view'], ['/invoices', 'invoices.view'], ['/payments', 'payments.view'],
      ['/credit-notes', 'invoices.view'], ['/trips', 'trips.view'], ['/itineraries', 'trips.view'],
    ['/vouchers', 'trips.view'], ['/reports', 'reports.view'], ['/staff', 'staff.manage'],
    ['/letters', 'letters.view'],
      ['/audit-log', 'reports.view'], ['/settings/company', 'settings.manage'],
  ] as const;
  const area = protectedAreas.find(([prefix]) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`));
  if (area && !hasPermission(area[1])) {
    return <AppLayout><div className="flex min-h-full items-center justify-center p-6"><div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><p className="text-sm font-semibold uppercase tracking-wide text-red-600">Access restricted</p><h1 className="mt-2 text-2xl font-bold text-slate-900">You do not have access to this section</h1><p className="mt-3 text-sm text-slate-500">Ask an administrator to grant the required permission, or return to your dashboard.</p><Button className="mt-6" onClick={() => navigate('/dashboard')}>Back to dashboard</Button></div></div></AppLayout>;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:id" element={<ClientProfilePage />} />
        <Route path="/prospects" element={<ProspectsPage />} />
        <Route path="/quotations" element={<QuotationsPage />} />
        <Route path="/quotations/:id" element={<QuotationDetailsPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailsPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/receipts" element={<ReceiptsPage />} />
        <Route path="/credit-notes" element={<CreditNotesPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/itineraries" element={<ItinerariesPage />} />
        <Route path="/itineraries/templates" element={<ItineraryTemplatesPage />} />
        <Route path="/vouchers" element={<VouchersPage />} />
        <Route path="/letters" element={<LettersPage />} />
        <Route path="/reports/vouchers" element={<VoucherOperationsPage />} />
        <Route path="/reports/financial" element={<ReportsPage type="financial" />} />
        <Route path="/reports/sales" element={<ReportsPage type="sales" />} />
        <Route path="/reports/quotations" element={<QuotationReportPage />} />
        <Route path="/reports/trips" element={<ReportsPage type="trips" />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/audit-log" element={<AuditLogPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/settings/company" element={<CompanySettingsPage />} />
        <Route path="*" element={<DashboardPage />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
}
