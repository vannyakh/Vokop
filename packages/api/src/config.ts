/** Shared HTTP defaults for browser + Node consumers of `@vokop/api`. */
export const API_DEFAULTS = {
  /** Empty string = same-origin / Vite dev proxy (`/api/v1/...`). */
  browserBaseUrl: '',
  serverBaseUrl: 'http://localhost:4000',
  timeoutMs: 30_000,
} as const;

export interface ApiConfig {
  baseUrl?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
  /** Attach `Authorization: Bearer` when a token is available. */
  getAccessToken?: () => string | undefined | null;
}

export function normalizeBaseUrl(baseUrl?: string): string {
  return (baseUrl ?? '').replace(/\/$/, '');
}

export function resolveServerBaseUrl(): string {
  return normalizeBaseUrl(process.env.API_BASE_URL ?? process.env.VITE_API_URL ?? API_DEFAULTS.serverBaseUrl);
}

/** Vite/browser client — empty base URL uses the dev proxy. */
export function createBrowserApiConfig(
  baseUrl?: string,
  getAccessToken?: () => string | undefined | null,
): ApiConfig {
  return {
    baseUrl: normalizeBaseUrl(baseUrl ?? API_DEFAULTS.browserBaseUrl),
    timeoutMs: API_DEFAULTS.timeoutMs,
    getAccessToken,
  };
}
