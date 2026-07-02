import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/router';
import { ThemeProvider } from './context/ThemeContext';
import { TabProvider } from './context/TabContext';
import { NotificationProvider } from './context/NotificationContext';
import { SettingsProvider } from './context/SettingsContext';
import { SearchModalProvider } from './context/SearchModalContext';
import { SearchModal } from './components/organisms/SearchModal';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TabProvider>
        <NotificationProvider>
          <SettingsProvider>
            <SearchModalProvider>
              <RouterProvider router={router} />
              <SearchModal />
            </SearchModalProvider>
          </SettingsProvider>
        </NotificationProvider>
      </TabProvider>
    </ThemeProvider>
  </StrictMode>
);
