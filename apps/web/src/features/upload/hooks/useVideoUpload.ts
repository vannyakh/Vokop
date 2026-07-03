import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/features/project';
import { useAuthStore } from '@/features/auth';
import { api, queryClient, queryKeys } from '@/lib/api';
import { ROUTES } from '@/routes/paths';

export function useVideoUpload() {
  const setVideo = useAppStore((s) => s.setVideo);
  const hydrateProject = useAppStore((s) => s.hydrateProject);
  const navigate = useNavigate();

  const uploadVideo = useCallback(
    (file: File) => {
      const { isLoggedIn, accessToken } = useAuthStore.getState();
      setVideo(file, URL.createObjectURL(file));

      if (!isLoggedIn || !accessToken) {
        navigate(ROUTES.studio);
        return;
      }

      void api
        .createProject({
          title: file.name,
          status: 'processing',
          progress: 10,
        })
        .then((response) => {
          queryClient.setQueryData(queryKeys.projects.detail(response.project.id), response.project);
          void queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() });
          hydrateProject({
            id: response.project.id,
            title: response.project.title,
            aspectRatio: response.project.aspectRatio,
            status: response.project.status,
            progress: response.project.progress,
            durationSec: response.project.durationSec,
          });
          navigate(`${ROUTES.studio}/${response.project.id}`);
        })
        .catch(() => {
          navigate(ROUTES.studio);
        });
    },
    [hydrateProject, navigate, setVideo],
  );

  return { uploadVideo };
}
