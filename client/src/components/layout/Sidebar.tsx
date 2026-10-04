import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn, getInitials } from '../../utils';

type NavItem = { label: string; href: string; icon: ReactNode } | { group: string; items: Array<{ label: string; href: string; icon: ReactNode }> };

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
    ),
  },
  {
    group: 'CRM',
    items: [
      { label: 'Clients', href: '/clients', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
      { label: 'Prospects', href: '/prospects', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
    ],
  },
  {
    group: 'Sales',
    items: [
      { label: 'Quotations', href: '/quotations', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
      { label: 'Invoices', href: '/invoices', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg> },
    ],
  },
  {
    group: 'Finance',
    items: [
      { label: 'Payments', href: '/payments', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
      { label: 'Receipts', href: '/receipts', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 2h12a2 2 0 012 2v18l-4-2-4 2-4-2-4 2V4a2 2 0 012-2z" /></svg> },
      { label: 'Credit notes', href: '/credit-notes', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg> },
    ],
  },
  {
    group: 'Operations',
    items: [
      { label: 'Trips', href: '/trips', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
      { label: 'Itineraries', href: '/itineraries', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
      { label: 'Itinerary templates', href: '/itineraries/templates', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm4 2h8m-8 4h8m-8 4h5" /></svg> },
      { label: 'Vouchers', href: '/vouchers', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg> },
    ],
  },
  {
    group: 'Reports',
    items: [
      { label: 'Financial', href: '/reports/financial', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
      { label: 'Sales', href: '/reports/sales', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
      { label: 'Quotations report', href: '/reports/quotations', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5h6m-8 4h10m-10 4h10m-10 4h6" /></svg> },
      { label: 'Sales', href: '/reports/sales', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
      { label: 'Trip', href: '/reports/trips', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12h18M5 12l2-7h10l2 7m-1 0v6H6v-6" /></svg> },
      { label: 'Voucher operations', href: '/reports/vouchers', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h8m-8 4h8m-8 4h5M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg> },
    ],
  },
  {
    group: 'Admin',
    items: [
      { label: 'Notifications', href: '/notifications', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9a6 6 0 00-12 0v.75a8.967 8.967 0 01-2.31 6.022c1.733.64 3.55 1.09 5.454 1.31m5.713 0a24.255 24.255 0 01-5.713 0m5.713 0a3 3 0 11-5.713 0" /></svg> },
      { label: 'Letters', href: '/letters', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 10h16M4 14h10M4 18h8" /></svg> },
      { label: 'Staff', href: '/staff', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
      { label: 'Audit Log', href: '/audit-log', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
      { label: 'Settings', href: '/settings/company', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    ],
  },
];

export default function Sidebar({ id, collapsed, onToggle, mobileOpen = false, onClose }: { id?: string; collapsed: boolean; onToggle: () => void; mobileOpen?: boolean; onClose?: () => void }) {
  const { auth, logout, hasPermission } = useAuth();
  const location = useLocation();
  const company = auth?.company;

  const requiredPermission: Record<string, string> = {
    '/dashboard': 'dashboard.view',
    '/clients': 'clients.view',
    '/prospects': 'prospects.view',
    '/quotations': 'quotations.view',
    '/invoices': 'invoices.view',
    '/payments': 'payments.view',
    '/receipts': 'payments.view',
    '/credit-notes': 'invoices.view',
    '/trips': 'trips.view',
    '/itineraries': 'trips.view',
    '/itineraries/templates': 'trips.view',
    '/vouchers': 'trips.view',
    '/reports/financial': 'finance.view',
    '/reports/sales': 'reports.view',
    '/reports/trips': 'reports.view',
    '/reports/vouchers': 'reports.view',
    '/reports/quotations': 'reports.view',
    '/notifications': '',
    '/staff': 'staff.manage',
    '/audit-log': 'reports.view',
    '/settings/company': 'settings.manage',
  };
  const canAccess = (href: string) => !requiredPermission[href] || hasPermission(requiredPermission[href]);

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <aside
      id={id}
      aria-label="Main navigation"
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col h-screen bg-[#0f4c81] text-white transition-all duration-300 flex-shrink-0 md:relative md:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            {company?.logoUrl ? <img src={company.logoUrl} alt="Company logo" className="w-8 h-8 rounded-lg object-cover bg-white" /> : <div className="w-8 h-8 bg-[#f5a623] rounded-lg flex items-center justify-center text-[#0f4c81] font-black text-sm">{(company?.name || 'TV').slice(0, 2).toUpperCase()}</div>}
            <div>
              <div className="font-bold text-sm leading-none truncate max-w-40">{company?.name || 'TuaVois'}</div>
              <div className="text-xs text-blue-200 leading-none mt-0.5">Travel ERP</div>
            </div>
          </div>
        )}
        {collapsed && (company?.logoUrl ? <img src={company.logoUrl} alt="Company logo" className="w-8 h-8 rounded-lg object-cover bg-white mx-auto" /> : <div className="w-8 h-8 bg-[#f5a623] rounded-lg flex items-center justify-center text-[#0f4c81] font-black text-sm mx-auto">{(company?.name || 'TV').slice(0, 2).toUpperCase()}</div>)}
        <button onClick={onToggle} className="text-blue-200 hover:text-white transition-colors ml-auto" aria-label="Toggle sidebar">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {collapsed
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />}
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {auth?.user.role === 'SUPERADMIN' && auth.user.scope === 'GLOBAL' && <Link to="/system" onClick={onClose} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all', isActive('/system') ? 'bg-amber-400 text-[#0f4c81]' : 'bg-white/10 text-amber-200 hover:bg-white/20')} title={collapsed ? 'System administration' : undefined}><span className="text-lg">◆</span>{!collapsed && 'System administration'}</Link>}
        {navItems.map((item, idx) => {
          if ('href' in item) {
            if (!canAccess(item.href)) return null;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  active ? 'bg-white/15 text-white' : 'text-blue-100 hover:bg-white/10 hover:text-white'
                )}
              >
                {item.icon}
                {!collapsed && item.label}
              </Link>
            );
          }
          const visibleItems = item.items.filter((child) => canAccess(child.href));
          if (!visibleItems.length) return null;
          return (
            <div key={idx}>
              {!collapsed && (
                <p className="text-xs font-semibold text-blue-300/70 uppercase tracking-widest px-3 pt-3 pb-1">{item.group}</p>
              )}
              {collapsed && <div className="border-t border-white/10 my-2" />}
              {visibleItems.map((child) => {
                const active = isActive(child.href);
                return (
                  <Link
                    key={child.href}
                    to={child.href}
                    onClick={onClose}
                    title={collapsed ? child.label : undefined}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      active ? 'bg-white/15 text-white' : 'text-blue-100 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {child.icon}
                    {!collapsed && child.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className={cn('border-t border-white/10 p-3', collapsed ? 'flex flex-col items-center gap-2' : 'flex items-center gap-3')}>
        <div className="w-8 h-8 rounded-full bg-[#f5a623] flex items-center justify-center text-[#0f4c81] font-bold text-xs flex-shrink-0">
          {getInitials(auth?.user.name || 'U')}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{auth?.user.name}</p>
            <p className="text-xs text-blue-200 truncate">{auth?.user.role}</p>
          </div>
        )}
        <button
          onClick={logout}
          title="Logout"
          className="text-blue-200 hover:text-white transition-colors p-1 rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </div>
    </aside>
  );
}
