import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys, videoFileKey } from '@/lib/api/queryKeys';
import { useAppStore } from '@/features/project';
import { useVideoToolsHealth } from '@/features/studio/hooks/useVideoToolsHealth';

/** Upload video to editing server once; reuse session for probe/filmstrip/jobs. */
export function useVideoSession() {
  const videoFile = useAppStore((s) => s.videoFile);
  const videoSessionId = useAppStore((s) => s.videoSessionId);
  const setVideoSessionId = useAppStore((s) => s.setVideoSessionId);
  const setDuration = useAppStore((s) => s.setDuration);
  const setVideoDimensions = useAppStore((s) => s.setVideoDimensions);
  const sessionLoading = useAppStore((s) => s.videoSessionLoading);
  const setVideoSessionLoading = useAppStore((s) => s.setVideoSessionLoading);
  const { ffmpegOk, ffmpegError, isReady } = useVideoToolsHealth();

  const fileKey = videoFileKey(videoFile);

  const query = useQuery({
    queryKey: queryKeys.video.session(fileKey ?? 'none'),
    queryFn: () => api.createVideoSession(videoFile!),
    enabled: Boolean(videoFile && fileKey && isReady && ffmpegOk),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: false,
  });

  useEffect(() => {
    setVideoSessionLoading(query.isFetching);
  }, [query.isFetching, setVideoSessionLoading]);

  useEffect(() => {
    if (!videoFile) {
      setVideoSessionId(null);
      return;
    }

    if (query.isFetching) {
      setVideoSessionId(null);
    }
  }, [videoFile, fileKey, query.isFetching, setVideoSessionId]);

  useEffect(() => {
    if (!videoFile) return;

    if (query.data) {
      setVideoSessionId(query.data.sessionId);

      if (query.data.probe.duration > 0) {
        setDuration(query.data.probe.duration);
      }
      if (query.data.probe.width > 0 && query.data.probe.height > 0) {
        setVideoDimensions(query.data.probe.width, query.data.probe.height);
      }
      return;
    }

    if (query.isError) {
      console.warn('[video-session] server session failed, using local file only:', query.error);
      setVideoSessionId(null);
    }
  }, [
    videoFile,
    query.data,
    query.isError,
    query.error,
    setVideoSessionId,
    setDuration,
    setVideoDimensions,
  ]);

  useEffect(() => {
    if (!videoFile || !isReady || ffmpegOk || !ffmpegError) return;
    console.warn('[video-session] server ffmpeg unavailable, using local file only:', ffmpegError);
    setVideoSessionId(null);
    setVideoSessionLoading(false);
  }, [videoFile, isReady, ffmpegOk, ffmpegError, setVideoSessionId, setVideoSessionLoading]);

  return {
    videoSessionId,
    sessionLoading: sessionLoading || query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  };
}
