import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/features/project';
import { ROUTES } from '@/routes/paths';

export function useVideoUpload() {
  const setVideo = useAppStore((s) => s.setVideo);
  const navigate = useNavigate();

  const uploadVideo = useCallback(
    (file: File) => {
      setVideo(file, URL.createObjectURL(file));
      navigate(ROUTES.studio);
    },
    [setVideo, navigate],
  );

  return { uploadVideo };
}
