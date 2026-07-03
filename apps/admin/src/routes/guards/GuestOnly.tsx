import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, userHasPermission } from '@/features/auth';
import { ADMIN_ROUTES } from '@vokop/shared';

/** Login routes — redirect authenticated admins to the dashboard. */
export function GuestOnly() {
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const accessToken = useAuthStore((s) => s.accessToken);

  if (isLoggedIn && accessToken && userHasPermission(user, 'admin.access')) {
    return <Navigate to={ADMIN_ROUTES.home} replace />;
  }

  return <Outlet />;
}
