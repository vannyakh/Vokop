import type { ReactNode } from 'react';
import { SearchModal } from '../components/organisms/SearchModal';
import { AdminConfigProvider } from '../context/AdminConfigContext';
import { AdminSessionProvider } from '../context/AdminSessionContext';
import { NotificationProvider } from '../context/NotificationContext';
import { SearchModalProvider } from '../context/SearchModalContext';
import { SettingsProvider } from '../context/SettingsContext';
import { TabProvider } from '../context/TabContext';
import { ThemeProvider } from '../context/ThemeContext';
import type { AdminShellConfig } from '../config/types';
import type { AdminSessionUser } from '../context/AdminSessionContext';
import { vokopAdminNav } from '../config/navPresets';

export function AdminShell({
  config = vokopAdminNav,
  user = null,
  onLogout,
  children,
}: {
  config?: AdminShellConfig;
  user?: AdminSessionUser | null;
  onLogout?: () => void;
  children: ReactNode;
}) {
  return (
    <ThemeProvider>
      <AdminConfigProvider config={config}>
        <AdminSessionProvider user={user} onLogout={onLogout}>
          <TabProvider>
            <NotificationProvider>
              <SettingsProvider>
                <SearchModalProvider>
                  {children}
                  <SearchModal />
                </SearchModalProvider>
              </SettingsProvider>
            </NotificationProvider>
          </TabProvider>
        </AdminSessionProvider>
      </AdminConfigProvider>
    </ThemeProvider>
  );
}
