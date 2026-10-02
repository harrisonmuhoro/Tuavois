import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function PermissionGate({ permission, permissions, children, fallback = null }: { permission?: string; permissions?: string[]; children: ReactNode; fallback?: ReactNode }) {
  const { hasPermission } = useAuth();
  const allowed = permission ? hasPermission(permission) : (permissions || []).some((item) => hasPermission(item));
  return allowed ? <>{children}</> : <>{fallback}</>;
}

export function RoleGate({ roles, children, fallback = null }: { roles: string[]; children: ReactNode; fallback?: ReactNode }) {
  const { auth } = useAuth();
  return auth && roles.includes(auth.user.role) ? <>{children}</> : <>{fallback}</>;
}
