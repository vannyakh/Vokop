import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';

/** Cached video-tools health — used to skip server ffmpeg paths when unavailable. */
export function useVideoToolsHealth() {
  const query = useQuery({
    queryKey: queryKeys.video.health(),
    queryFn: () => api.videoToolsHealth(),
    staleTime: 60_000,
    retry: false,
  });

  const isReady = query.isSuccess || query.isError;
  const ffmpegOk = query.isSuccess ? (query.data.ffmpeg?.ok ?? true) : false;
  const ffmpegError =
    query.data?.ffmpeg?.error ??
    (query.isError ? 'Video tools health check failed' : undefined);

  return {
    ffmpegOk,
    ffmpegError,
    isReady,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
