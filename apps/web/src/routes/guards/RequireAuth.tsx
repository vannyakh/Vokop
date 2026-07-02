import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, userHasPermission } from '@/features/auth';
import { ROUTES } from '@/routes/paths';

export function RequireAuth() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  if (!isLoggedIn) return <Navigate to={ROUTES.home} replace />;
  return <Outlet />;
}

export function RequireAdmin() {
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  if (!isLoggedIn) return <Navigate to={ROUTES.home} replace />;
  if (!userHasPermission(user, 'admin.access')) {
    return <Navigate to={ROUTES.home} replace />;
  }
  return <Outlet />;
}
