import { Navigate } from 'react-router-dom';
import { useAppStore } from '@/features/project';
import { ROUTES } from '@/routes/paths';

interface RequireVideoProps {
  children: React.ReactNode;
}

export function RequireVideo({ children }: RequireVideoProps) {
  const videoUrl = useAppStore((s) => s.videoUrl);

  if (!videoUrl) {
    return <Navigate to={ROUTES.home} replace />;
  }

  return children;
}
