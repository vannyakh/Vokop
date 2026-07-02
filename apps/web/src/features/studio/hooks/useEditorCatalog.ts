import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/queryKeys';
import { getEditorCatalog, type EditorToolCatalog } from '@vokop/shared';

async function fetchEditorCatalog(): Promise<EditorToolCatalog[]> {
  try {
    const remote = await api.getEditorCatalog();
    return remote.tools as EditorToolCatalog[];
  } catch {
    return getEditorCatalog();
  }
}

export function useEditorCatalog() {
  const query = useQuery({
    queryKey: queryKeys.editor.catalog(),
    queryFn: fetchEditorCatalog,
    placeholderData: getEditorCatalog(),
    staleTime: 10 * 60_000,
  });

  return {
    ...query,
    catalog: query.data ?? getEditorCatalog(),
    loading: query.isPending,
  };
}
