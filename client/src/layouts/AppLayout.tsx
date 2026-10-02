import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';

export function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    if (mobileOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      {mobileOpen && <button type="button" aria-label="Close navigation" aria-expanded={mobileOpen} aria-controls="mobile-sidebar" className="fixed inset-0 z-30 bg-slate-950/40 md:hidden" onClick={() => setMobileOpen(false)} />}
      <button type="button" aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="mobile-sidebar" className="fixed left-3 top-3 z-20 rounded-lg bg-[#0f4c81] p-2 text-white shadow md:hidden" onClick={() => setMobileOpen(true)}><span aria-hidden="true">☰</span></button>
      <Sidebar id="mobile-sidebar" collapsed={collapsed} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} onToggle={() => setCollapsed((value) => !value)} />
      <div className="min-w-0 flex-1 flex flex-col h-screen">
        <Header />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
