import { createContext, useContext, type ReactNode } from 'react';
import type { AdminShellConfig } from '../config/types';
import { vokopAdminNav } from '../config/navPresets';

const AdminConfigContext = createContext<AdminShellConfig>(vokopAdminNav);

export function AdminConfigProvider({
  config,
  children,
}: {
  config: AdminShellConfig;
  children: ReactNode;
}) {
  return <AdminConfigContext.Provider value={config}>{children}</AdminConfigContext.Provider>;
}

export function useAdminConfig(): AdminShellConfig {
  return useContext(AdminConfigContext);
}
