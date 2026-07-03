import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  isAxiosError,
} from 'axios';
import type { ZodTypeAny, z } from 'zod';
import { API_DEFAULTS, normalizeBaseUrl, type ApiConfig } from './config.js';
import { apiErrorSchema } from './schemas/common.js';

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
