import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { AppRouter } from '@/routes/AppRouter';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { QueryProvider } from '@/components/layout/QueryProvider';
import i18n from '@/i18n';
import '@vokop/ui/styles.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <QueryProvider>
        <ThemeProvider>
          <AppRouter />
        </ThemeProvider>
      </QueryProvider>
    </I18nextProvider>
  </StrictMode>,
);
