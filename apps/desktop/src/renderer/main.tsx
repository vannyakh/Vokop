/**
 * Desktop renderer entry point.
 * Same providers as apps/web, but BackendProvider wraps with LocalBackend (IPC).
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.js';
import { BackendProvider, isElectron } from './lib/backend/context.js';
import { LocalBackend } from './lib/backend/local.js';
import { RemoteBackend } from './lib/backend/remote.js';
import '@vokop/ui/styles.css';
import './index.css';

// i18n — reuse the web app's i18n instance via shared packages
// (In a real setup you'd import the same i18n config from @vokop/i18n)
import i18n from '@web/i18n/index.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5_000 },
  },
});

// Choose backend based on runtime environment
const backend = isElectron() ? new LocalBackend() : new RemoteBackend();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <BackendProvider backend={backend}>
          <App />
        </BackendProvider>
      </QueryClientProvider>
    </I18nextProvider>
  </StrictMode>,
);
