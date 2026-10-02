import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = 'KES'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${currency} 0.00`;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency === 'KES' ? 'KES' : currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: string | Date | null | undefined, fmt = 'dd MMM yyyy'): string {
  if (!date) return '—';
  try { return format(new Date(date), fmt); }
  catch { return '—'; }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  try { return format(new Date(date), 'dd MMM yyyy, HH:mm'); }
  catch { return '—'; }
}

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '—';
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); }
  catch { return '—'; }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, max = 40): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    // Invoice
    DRAFT: 'bg-slate-100 text-slate-600',
    UNPAID: 'bg-orange-100 text-orange-700',
    PARTIALLY_PAID: 'bg-blue-100 text-blue-700',
    PAID: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
    // Quotation
    SENT: 'bg-blue-100 text-blue-700',
    ACCEPTED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-gray-100 text-gray-500',
    CONVERTED: 'bg-purple-100 text-purple-700',
    // Trip
    PLANNED: 'bg-slate-100 text-slate-600',
    CONFIRMED: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-emerald-100 text-emerald-700',
    COMPLETED: 'bg-green-100 text-green-700',
    // Prospect
    NEW: 'bg-slate-100 text-slate-600',
    CONTACTED: 'bg-blue-100 text-blue-700',
    QUALIFIED: 'bg-indigo-100 text-indigo-700',
    QUOTATION_SENT: 'bg-amber-100 text-amber-700',
    NEGOTIATION: 'bg-orange-100 text-orange-700',
    WON: 'bg-green-100 text-green-700',
    LOST: 'bg-red-100 text-red-700',
    // User
    ACTIVE: 'bg-green-100 text-green-700',
    INACTIVE: 'bg-gray-100 text-gray-500',
    SUSPENDED: 'bg-red-100 text-red-700',
  };
  return map[status] || 'bg-slate-100 text-slate-600';
}

export function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const e = error as any;
    const response = e.response?.data;
    if (response?.message) return response.message;
    if (Array.isArray(response?.errors) && response.errors.length > 0) {
      return response.errors.map((item: any) => item.message || String(item)).join(', ');
    }
    if (e.message) return e.message;
  }
  if (error instanceof Error) return error.message;
  return 'An error occurred';
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
