import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/features/project';
import { ROUTES } from '@/routes/paths';

export function useProjectNavigation() {
  const navigate = useNavigate();
  const resetProject = useAppStore((s) => s.resetProject);

  const closeProject = useCallback(() => {
    resetProject();
    navigate(ROUTES.home);
  }, [resetProject, navigate]);

  return { closeProject };
}
