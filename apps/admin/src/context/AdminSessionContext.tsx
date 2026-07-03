import { createContext, useContext, type ReactNode } from 'react';

export type AdminSessionUser = {
  name: string;
  email: string;
  initials?: string;
};

type AdminSessionContextValue = {
  user: AdminSessionUser | null;
  onLogout?: () => void;
};

const AdminSessionContext = createContext<AdminSessionContextValue>({
  user: null,
});

export function AdminSessionProvider({
  user,
  onLogout,
  children,
}: AdminSessionContextValue & { children: ReactNode }) {
  return (
    <AdminSessionContext.Provider value={{ user, onLogout }}>{children}</AdminSessionContext.Provider>
  );
}

export function useAdminSession(): AdminSessionContextValue {
  return useContext(AdminSessionContext);
}
