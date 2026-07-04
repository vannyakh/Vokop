import { createBrowserApiClient, routes } from '@vokop/api';
import { getAccessToken, useAuthStore } from '@/features/auth/store/useAuthStore';

/**
 * Browser API client (admin).
 * Same gateway routes as web — `/api/v1/...` via Vite proxy or `VITE_API_URL`.
 */
export const api = createBrowserApiClient(import.meta.env.VITE_API_URL, getAccessToken, {
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onTokenRefreshed: (session) => useAuthStore.getState().setSession(session),
  onAuthFailure: () => useAuthStore.getState().logout(),
});

export { routes };

export { ApiClient, ApiRequestError, createApiClient, createBrowserApiClient } from '@vokop/api';

export type { AuthSessionResponse, AuthUser, Role, AdminMenu } from '@vokop/api';

export { queryClient } from './queryClient';
export { queryKeys } from './queryKeys';
