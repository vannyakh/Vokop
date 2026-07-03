import { Outlet } from 'react-router-dom';
import { AdminShell, RouterNavBridge } from '@/shell';
import { DashboardLayout } from '@/components/templates/DashboardLayout';
import { useAuthMe } from '@/features/auth/hooks/useAuthQueries';
import { useAuthStore } from '@/features/auth';
import { api } from '@/lib/api';
import { createAdminShellConfig } from '@/config/adminConfig';

export function AdminShellLayout() {
  useAuthMe();

  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const logout = useAuthStore((s) => s.logout);

  return (
    <AdminShell
      config={createAdminShellConfig()}
      user={user ? { name: user.name, email: user.email } : null}
      onLogout={() => {
        if (refreshToken) void api.logout(refreshToken);
        logout();
      }}
    >
      <RouterNavBridge />
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </AdminShell>
  );
}
