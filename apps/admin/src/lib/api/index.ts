import { createApiClient, createBrowserApiConfig, createHttpClient } from '@vokop/api';
import { getAccessToken } from '@/features/auth/store/useAuthStore';
import { attachSessionRefreshInterceptor } from './setupSessionRefresh';

const http = createHttpClient(createBrowserApiConfig(import.meta.env.VITE_API_URL, getAccessToken));
attachSessionRefreshInterceptor(http);

export const api = createApiClient({ http });

export { queryClient } from './queryClient';
export { queryKeys } from './queryKeys';
