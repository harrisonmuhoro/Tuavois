import React, { useEffect, useRef, type ReactNode } from 'react';
import { cn, statusColor } from '../../utils';

// =============================================
// StatusBadge
// =============================================
interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const display = label || status.replace(/_/g, ' ');
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', statusColor(status), className)}>
      {display}
    </span>
  );
}

// =============================================
// StatCard
// =============================================
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: { value: number; label: string };
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate';
  className?: string;
}
const colorMap = {
  blue: 'bg-blue-50 text-blue-600 ring-blue-100',
  green: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  red: 'bg-red-50 text-red-600 ring-red-100',
  purple: 'bg-purple-50 text-purple-600 ring-purple-100',
  slate: 'bg-slate-50 text-slate-600 ring-slate-100',
};
export function StatCard({ title, value, subtitle, icon, trend, color = 'blue', className }: StatCardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 p-5 flex gap-4 items-start shadow-sm hover:shadow-md transition-shadow', className)}>
      {icon && (
        <div className={cn('flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center ring-1', colorMap[color])}>
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-500 font-medium truncate">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        {trend && (
          <p className={cn('text-xs mt-1 font-medium', trend.value >= 0 ? 'text-emerald-600' : 'text-red-600')}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================
// PageHeader
// =============================================
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumb?: Array<{ label: string; href?: string }>;
}
export function PageHeader({ title, subtitle, actions, breadcrumb }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {breadcrumb && (
          <nav className="flex items-center gap-1 text-xs text-slate-400 mb-1">
            {breadcrumb.map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>/</span>}
                {item.href ? (
                  <a href={item.href} className="hover:text-slate-600 transition-colors">{item.label}</a>
                ) : (
                  <span className="text-slate-500">{item.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 mt-3 sm:mt-0 sm:flex-shrink-0 sm:ml-4">{actions}</div>}
    </div>
  );
}

// =============================================
// EmptyState
// =============================================
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && <div className="text-slate-300 mb-4 text-5xl">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-400 max-w-xs mb-4">{description}</p>}
      {action && action}
    </div>
  );
}

// =============================================
// LoadingSkeleton
// =============================================
export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse" role="status" aria-live="polite" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-slate-100 rounded-lg" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

// =============================================
// Card
// =============================================
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 py-4 border-b border-slate-100', className)}>{children}</div>;
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

// =============================================
// Button
// =============================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}
const btnVariants = {
  primary: 'bg-[#0f4c81] text-white hover:bg-[#0a3563] focus:ring-blue-500 shadow-sm',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-400',
  outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-400',
};
const btnSizes = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'primary', size = 'md', loading, leftIcon, rightIcon, children, className, disabled, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn('inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed', btnVariants[variant], btnSizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-label="Loading" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

// =============================================
// Input / Select / Textarea
// =============================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}
export function Input({ label, error, hint, className, id, autoComplete, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const messageId = `${inputId}-message`;
  const inferredAutoComplete = autoComplete || (label?.toLowerCase().includes('email') ? 'email' : label?.toLowerCase().includes('password') ? 'new-password' : undefined);
  return (
    <div className="space-y-1">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">{label}</label>}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        autoComplete={inferredAutoComplete}
        className={cn('block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors', error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20', className)}
        {...props}
      />
      {error && <p id={messageId} className="text-xs text-red-500" role="alert">{error}</p>}
      {hint && !error && <p id={messageId} className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}
export function Select({ label, error, className, id, children, ...props }: SelectProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const messageId = `${inputId}-message`;
  return (
    <div className="space-y-1">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">{label}</label>}
      <select
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? messageId : undefined}
        className={cn('block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors', error && 'border-red-500', className)}
        {...props}
      >
        {children}
      </select>
      {error && <p id={messageId} className="text-xs text-red-500" role="alert">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}
export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const messageId = `${inputId}-message`;
  return (
    <div className="space-y-1">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">{label}</label>}
      <textarea
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? messageId : undefined}
        rows={3}
        className={cn('block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors resize-none', error && 'border-red-500', className)}
        {...props}
      />
      {error && <p id={messageId} className="text-xs text-red-500" role="alert">{error}</p>}
    </div>
  );
}

// =============================================
// ConfirmDialog
// =============================================
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  destructive?: boolean;
}
export function ConfirmDialog({ open, title, description, onConfirm, onCancel, loading, destructive }: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !loading) onCancel(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" role="presentation">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 animate-in" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description">
        <h3 id="confirm-dialog-title" className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
        <p id="confirm-dialog-description" className="text-sm text-slate-500 mb-5">{description}</p>
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end mt-2">
          <Button ref={cancelButtonRef} variant="outline" onClick={onCancel} disabled={loading} className="w-full sm:w-auto">Cancel</Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} className="w-full sm:w-auto">
            {destructive ? 'Delete' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================
// Modal
// =============================================
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}
const modalSizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
};
export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" role="presentation">
      <div className={cn('bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-y-auto', modalSizes[size])} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 id="modal-title" className="text-base font-semibold text-slate-900">{title}</h2>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close dialog" className="text-slate-400 hover:text-slate-600 transition-colors rounded-lg p-1 hover:bg-slate-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// =============================================
// Table
// =============================================
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn('px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 first:rounded-tl-lg last:rounded-tr-lg', className)}>{children}</th>;
}
export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 text-slate-700 border-t border-slate-100', className)}>{children}</td>;
}

// =============================================
// Pagination
// =============================================
interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}
export function Pagination({ page, totalPages, total, limit, onPageChange }: PaginationProps) {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return (
    <div className="flex items-center justify-between px-2 py-3">
      <p className="text-xs text-slate-500">{start}–{end} of {total} records</p>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>←</Button>
        {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
          const p = i + 1;
          return (
            <Button key={p} variant={p === page ? 'primary' : 'outline'} size="sm" onClick={() => onPageChange(p)}>
              {p}
            </Button>
          );
        })}
        <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>→</Button>
      </div>
    </div>
  );
}

// =============================================
// FileUpload
// =============================================
interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSizeMb?: number;
}
export function FileUpload({ onUpload, accept, maxSizeMb = 10 }: FileUploadProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>();
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File size must be less than ${maxSizeMb}MB`);
      return;
    }
    
    try {
      setLoading(true);
      setError(undefined);
      await onUpload(file);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className={cn("flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors", loading && "opacity-50 cursor-not-allowed")}>
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {loading ? (
             <span className="w-6 h-6 mb-3 border-2 border-[#0f4c81] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-8 h-8 mb-4 text-slate-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
            </svg>
          )}
          <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
          <p className="text-xs text-slate-500">{accept ? accept.replace(/,/g, ', ') : 'Any file'} (Max {maxSizeMb}MB)</p>
        </div>
        <input type="file" className="hidden" accept={accept} onChange={handleFileChange} disabled={loading} />
      </label>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
