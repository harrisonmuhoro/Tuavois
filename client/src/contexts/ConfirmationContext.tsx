import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { ConfirmDialog } from '../components/ui';

type Confirmation = { title: string; description: string; destructive?: boolean; resolve: (accepted: boolean) => void };
const ConfirmationContext = createContext<{ confirm: (options: Omit<Confirmation, 'resolve'>) => Promise<boolean> } | null>(null);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Confirmation | null>(null);
  const confirm = useCallback((options: Omit<Confirmation, 'resolve'>) => new Promise<boolean>((resolve) => setRequest({ ...options, resolve })), []);
  const finish = (accepted: boolean) => { request?.resolve(accepted); setRequest(null); };
  return <ConfirmationContext.Provider value={{ confirm }}>{children}{request && <ConfirmDialog open title={request.title} description={request.description} destructive={request.destructive} onConfirm={() => finish(true)} onCancel={() => finish(false)} />}</ConfirmationContext.Provider>;
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) throw new Error('useConfirmation must be used within ConfirmationProvider');
  return context;
}
