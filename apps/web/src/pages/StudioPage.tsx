import { Loader2 } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { StudioWorkspace } from '@/features/studio';
import { useStudioProject } from '@/features/project/hooks/useStudioProject';
import { ROUTES } from '@/routes/paths';

export function StudioPage() {
  const { projectId } = useParams<{ projectId?: string }>();
  const { isLoading, isError } = useStudioProject(projectId);

  if (projectId && isLoading) {
    return (
      <div className="studio-shell min-h-screen flex items-center justify-center gap-3 text-sm text-muted">
        <Loader2 className="animate-spin" size={18} />
        <span>Loading project…</span>
      </div>
    );
  }

  if (projectId && isError) {
    return <Navigate to={ROUTES.home} replace />;
  }

  return <StudioWorkspace />;
}
