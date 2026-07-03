import {
  createApiClient,
  createBrowserApiConfig,
  isAxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from '@vokop/api';
import { getAccessToken, useAuthStore } from '@/features/auth/store/useAuthStore';

type RetryableRequestConfig = InternalAxiosRequestConfig & { _authRetry?: boolean };

const refreshClient = createApiClient(createBrowserApiConfig(import.meta.env.VITE_API_URL));

let refreshInFlight: Promise<boolean> | null = null;

function isAuthEndpoint(config: InternalAxiosRequestConfig): boolean {
  const url = config.url ?? '';
  return url.includes('/auth/refresh') || url.includes('/auth/login') || url.includes('/auth/register');
}

async function refreshSessionOnce(): Promise<boolean> {
  const { refreshToken, isLoggedIn } = useAuthStore.getState();
  if (!isLoggedIn || !refreshToken) {
    useAuthStore.getState().logout();
    return false;
  }

  try {
    const session = await refreshClient.refreshSession(refreshToken);
    useAuthStore.getState().setSession(session);
    return true;
  } catch {
    useAuthStore.getState().logout();
    return false;
  }
}

function queueSessionRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = refreshSessionOnce().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** Retry once after refreshing tokens; logout when refresh fails. */
export function attachSessionRefreshInterceptor(http: AxiosInstance): void {
  http.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (!isAxiosError(error) || error.response?.status !== 401) {
        throw error;
      }

      const config = error.config as RetryableRequestConfig | undefined;
      if (!config || config._authRetry || isAuthEndpoint(config)) {
        if (config && !isAuthEndpoint(config)) {
          useAuthStore.getState().logout();
        }
        throw error;
      }

      const refreshed = await queueSessionRefresh();
      if (!refreshed) throw error;

      config._authRetry = true;
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return http.request(config);
    },
  );
}
