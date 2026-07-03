import { createBrowserApiClient } from '@vokop/api';
import { getAccessToken, useAuthStore } from '@/features/auth/store/useAuthStore';

/** Browser API client — empty base URL uses the Vite dev proxy (`/api/v1/...`). */
export const api = createBrowserApiClient(import.meta.env.VITE_API_URL, getAccessToken, {
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onTokenRefreshed: (session) => useAuthStore.getState().setSession(session),
  onAuthFailure: () => useAuthStore.getState().logout(),
});

export { ApiClient, ApiRequestError, createApiClient, createBrowserApiClient } from '@vokop/api';

export type {
  AuthSessionResponse,
  AuthUser,
  FilmstripResponse,
  HealthResponse,
  VideoJobResponse,
  VideoProbeResponse,
  VideoSessionResponse,
  EditorCatalogResponse,
  ApplyEditorEditResponse,
  Role,
  AdminMenu,
} from '@vokop/api';

export type { EditorToolCatalog, EditorPreset, ProjectEditorState } from '@vokop/shared';

export { queryClient } from './queryClient';
export { queryKeys, videoFileKey } from './queryKeys';
