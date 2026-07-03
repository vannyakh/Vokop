import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import '@vokop/ui/styles.css';
import '@/admin-shell.css';
import { AuthHydrationGate } from '@/components/AuthHydrationGate';
import { queryClient } from '@/lib/api';
import { router } from '@/routes';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthHydrationGate>
        <RouterProvider router={router} />
      </AuthHydrationGate>
    </QueryClientProvider>
  </StrictMode>,
);
