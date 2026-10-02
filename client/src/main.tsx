import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import { Toaster, toast } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { getErrorMessage } from './utils'
import { ConfirmationProvider } from './contexts/ConfirmationContext'

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => {
      toast.success('Action successful!', { id: 'global-success' });
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error), { id: 'global-error' });
    },
  }),
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ConfirmationProvider><App /></ConfirmationProvider>
          <Toaster position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
