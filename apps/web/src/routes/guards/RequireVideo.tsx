import { Navigate } from 'react-router-dom';
import { useAppStore } from '@/features/project';
import { ROUTES } from '@/routes/paths';

interface RequireVideoProps {
  children: React.ReactNode;
  allowBlankProject?: boolean;
}

export function RequireVideo({ children, allowBlankProject = false }: RequireVideoProps) {
  const videoUrl = useAppStore((s) => s.videoUrl);

  if (!videoUrl && !allowBlankProject) {
    return <Navigate to={ROUTES.home} replace />;
  }

  return children;
}
