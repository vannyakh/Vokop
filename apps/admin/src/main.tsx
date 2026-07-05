import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import '@/admin-shell.css';
import '@vokop/ui/styles.css';
import './index.css';
import { AuthHydrationGate } from '@/components/AuthHydrationGate';
import { ThemeProvider } from '@/context/ThemeContext';
import { queryClient } from '@/lib/api';
import { router } from '@/routes';
import i18n from '@/i18n';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthHydrationGate>
            <RouterProvider router={router} />
          </AuthHydrationGate>
        </ThemeProvider>
      </QueryClientProvider>
    </I18nextProvider>
  </StrictMode>,
);
