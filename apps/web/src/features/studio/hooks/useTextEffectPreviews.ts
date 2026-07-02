import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';
import type { TextEffectPreview, TextEffectPreviewsResponse } from '@vokop/api';
import type { CanvasTextEffectId } from '@/types/canvas';

const EMPTY: TextEffectPreviewsResponse = { previews: [], pixabayEnabled: false };

async function fetchTextEffectPreviews(): Promise<TextEffectPreviewsResponse> {
  try {
    return await api.getTextEffectPreviews();
  } catch {
    return EMPTY;
  }
}

export function useTextEffectPreviews() {
  const query = useQuery({
    queryKey: queryKeys.media.textEffectPreviews(),
    queryFn: fetchTextEffectPreviews,
    staleTime: 5 * 60_000,
    placeholderData: EMPTY,
  });

  const previewMap = useMemo(() => {
    const map = new Map<CanvasTextEffectId, TextEffectPreview>();
    for (const preview of query.data?.previews ?? []) {
      map.set(preview.effectId as CanvasTextEffectId, preview);
    }
    return map;
  }, [query.data?.previews]);

  return {
    ...query,
    previews: query.data?.previews ?? [],
    previewMap,
    loading: query.isPending,
    pixabayEnabled: query.data?.pixabayEnabled ?? false,
  };
}
