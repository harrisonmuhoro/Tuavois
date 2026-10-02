import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { AuthState } from '../types';
import { authApi } from '../api/services';

interface AuthContextType {
  auth: AuthState | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'tuavois_token';
const USER_KEY = 'tuavois_user';

const workspaceRole = (user: any) => {
  if (user.role === 'ADMIN' || user.role?.name === 'ADMIN') return 'ADMIN';
  const department = String(user.department || '').toLowerCase();
  if (department.includes('sales')) return 'SALES_CONSULTANT';
  if (department.includes('operation')) return 'OPERATIONS_STAFF';
  if (department.includes('account') || department.includes('finance')) return 'ACCOUNTANT';
  return user.role?.name || user.role || 'STAFF';
};

function loadStoredAuth(): AuthState | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = localStorage.getItem(USER_KEY);
    if (token && user) return { token, user: JSON.parse(user) };
  } catch {}
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(loadStoredAuth);

  useEffect(() => {
    if (!auth) return;
    authApi.me().then(({ data: response }) => {
      if (!response.success) return;
      const refreshed = { ...auth, user: { ...auth.user, ...response.data, role: workspaceRole(response.data) } };
      localStorage.setItem(USER_KEY, JSON.stringify(refreshed.user));
      setAuth(refreshed);
    }).catch(() => { /* The API client handles expired sessions; preserve the local session for its normal recovery path. */ });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data: res } = await authApi.login({ email, password });
    if (!res.success) throw new Error(res.message || 'Login failed');
    const authData: AuthState = { token: res.data.token, user: { ...res.data.user, role: workspaceRole(res.data.user) } };
    localStorage.setItem(TOKEN_KEY, authData.token);
    localStorage.setItem(USER_KEY, JSON.stringify(authData.user));
    setAuth(authData);
  }, []);

  const logout = useCallback(() => {
    authApi.logout().catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAuth(null);
    window.location.href = '/login';
  }, []);

  const hasPermission = useCallback(
    (permission: string) => {
      if (!auth) return false;
      if (auth.user.role === 'ADMIN') return true;
      return auth.user.permissions.includes(permission);
    },
    [auth]
  );

  const isAdmin = useCallback(() => auth?.user.role === 'ADMIN', [auth]);

  return (
    <AuthContext.Provider value={{ auth, login, logout, hasPermission, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
