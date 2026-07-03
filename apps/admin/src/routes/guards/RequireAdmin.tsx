import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, userHasPermission } from '@/features/auth';

export function RequireAdmin() {
  const user = useAuthStore((s) => s.user);

  if (!userHasPermission(user, 'admin.access')) {
    return <Navigate to="/login" replace state={{ reason: 'forbidden' }} />;
  }

  return <Outlet />;
}
