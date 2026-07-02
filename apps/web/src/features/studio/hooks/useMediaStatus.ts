import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';
import type { MediaStatusResponse } from '@vokop/api';

const UNCONFIGURED: MediaStatusResponse = { pixabay: false, giphy: false };

async function fetchMediaStatus(): Promise<MediaStatusResponse> {
  try {
    return await api.getMediaStatus();
  } catch {
    return UNCONFIGURED;
  }
}

export function useMediaStatus() {
  return useQuery({
    queryKey: queryKeys.media.status(),
    queryFn: fetchMediaStatus,
    staleTime: 5 * 60_000,
    placeholderData: UNCONFIGURED,
  });
}

export function useMediaStatusFlags() {
  const query = useMediaStatus();
  return {
    pixabay: query.data?.pixabay ?? false,
    giphy: query.data?.giphy ?? false,
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}
