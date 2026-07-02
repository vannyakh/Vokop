import { createApiClient } from '@vokop/api';

/** Browser API client — uses Vite dev proxy when VITE_API_URL is unset. */
export const api = createApiClient({
  baseUrl:
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL ?? '',
});

export { ApiClient, ApiRequestError } from '@vokop/api';
export type {
  FilmstripResponse,
  HealthResponse,
  VideoJobResponse,
  VideoProbeResponse,
  VideoSessionResponse,
  EditorCatalogResponse,
  ApplyEditorEditResponse,
} from '@vokop/api';
export type { EditorToolCatalog, EditorPreset, ProjectEditorState } from '@vokop/shared';
