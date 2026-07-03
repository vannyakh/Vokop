import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  isAxiosError,
} from 'axios';
import type { ZodTypeAny, z } from 'zod';
import { API_DEFAULTS, normalizeBaseUrl, type ApiConfig } from './config.js';
import { apiErrorSchema } from './schemas/common.js';
import { authSessionResponseSchema } from './schemas/auth.js';
import { routes } from './routes.js';

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

type RetryableConfig = AxiosRequestConfig & { _retry?: boolean };

export function createHttpClient(config: ApiConfig = {}): AxiosInstance {
  const instance = axios.create({
    baseURL: normalizeBaseUrl(config.baseUrl ?? API_DEFAULTS.serverBaseUrl),
    timeout: config.timeoutMs ?? API_DEFAULTS.timeoutMs,
    headers: config.headers,
  });

  if (config.getAccessToken) {
    instance.interceptors.request.use((req) => {
      const token = config.getAccessToken?.();
      if (token) req.headers.Authorization = `Bearer ${token}`;
      return req;
    });
  }

  if (config.getRefreshToken && config.onTokenRefreshed && config.onAuthFailure) {
    let isRefreshing = false;
    let queue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

    function flushQueue(err: unknown, token: string | null) {
      for (const entry of queue) {
        if (err) entry.reject(err);
        else entry.resolve(token!);
      }
      queue = [];
    }

    instance.interceptors.response.use(
      (res) => res,
      async (err: unknown) => {
        if (!isAxiosError(err)) return Promise.reject(err);

        const status = err.response?.status;
        const originalReq = err.config as RetryableConfig | undefined;

        // Skip: not 401, already retried, or the refresh/logout endpoint itself
        if (
          status !== 401 ||
          !originalReq ||
          originalReq._retry ||
          originalReq.url === routes.auth.refresh ||
          originalReq.url === routes.auth.logout
        ) {
          return Promise.reject(err);
        }

        if (isRefreshing) {
          // Park this request until the in-flight refresh resolves
          return new Promise<string>((resolve, reject) => {
            queue.push({ resolve, reject });
          }).then((newToken) => {
            const req = { ...originalReq };
            req.headers = { ...(req.headers ?? {}), Authorization: `Bearer ${newToken}` };
            return instance.request(req);
          });
        }

        const refreshToken = config.getRefreshToken?.();
        if (!refreshToken) {
          config.onAuthFailure!();
          return Promise.reject(err);
        }

        originalReq._retry = true;
        isRefreshing = true;

        try {
          const { data } = await instance.post(routes.auth.refresh, { refreshToken });
          const session = authSessionResponseSchema.parse(data);
          config.onTokenRefreshed!(session);

          const newToken = session.tokens.accessToken;
          flushQueue(null, newToken);

          const req = { ...originalReq };
          req.headers = { ...(req.headers ?? {}), Authorization: `Bearer ${newToken}` };
          return instance.request(req);
        } catch (refreshErr) {
          flushQueue(refreshErr, null);
          config.onAuthFailure!();
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      },
    );
  }

  return instance;
}

export function parseData<S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  return schema.parse(data);
}

/** @deprecated Use {@link parseData} with axios response data. */
export function parseJson<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  return parseData(schema, data);
}

export function toApiRequestError(err: unknown, fallbackMessage: string): ApiRequestError {
  if (isAxiosError(err)) {
    const body = err.response?.data;
    const parsed = apiErrorSchema.safeParse(body);
    return new ApiRequestError(
      parsed.success ? parsed.data.error : err.message || fallbackMessage,
      err.response?.status ?? 0,
      body,
    );
  }

  if (err instanceof ApiRequestError) return err;
  if (err instanceof Error) return new ApiRequestError(err.message, 0);
  return new ApiRequestError(fallbackMessage, 0);
}

export async function apiRequest<S extends ZodTypeAny>(
  http: AxiosInstance,
  schema: S,
  config: AxiosRequestConfig,
  fallbackMessage: string,
): Promise<z.output<S>> {
  try {
    const { data } = await http.request(config);
    return parseData(schema, data);
  } catch (err) {
    throw toApiRequestError(err, fallbackMessage);
  }
}
