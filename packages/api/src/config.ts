/// <reference types="node" />

import { DEFAULT_DEV_URLS } from '@vokop/shared/config/ports';
import type { AuthSessionResponse } from './schemas/auth.js';

/** Shared HTTP defaults for browser + Node consumers of `@vokop/api`. */
export const API_DEFAULTS = {
  /** Empty string = same-origin / Vite dev proxy (`/api/v1/...`). */
  browserBaseUrl: '',
  serverBaseUrl: DEFAULT_DEV_URLS.gateway,
  timeoutMs: 30_000,
} as const;

export interface ApiConfig {
  baseUrl?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
  /** Attach `Authorization: Bearer` when a token is available. */
  getAccessToken?: () => string | undefined | null;
  /**
   * Return the current refresh token so the 401 interceptor can attempt
   * a silent token rotation before giving up and calling `onAuthFailure`.
   */
  getRefreshToken?: () => string | undefined | null;
  /** Called after a successful silent token rotation — persist the new session. */
  onTokenRefreshed?: (session: AuthSessionResponse) => void;
  /** Called when a 401 cannot be recovered (no refresh token, or rotation failed). */
  onAuthFailure?: () => void;
}

export function normalizeBaseUrl(baseUrl?: string): string {
  return (baseUrl ?? '').replace(/\/$/, '');
}

export function resolveServerBaseUrl(): string {
  return normalizeBaseUrl(process.env.API_BASE_URL ?? process.env.VITE_API_URL ?? API_DEFAULTS.serverBaseUrl);
}

export interface BrowserApiOptions
  extends Pick<ApiConfig, 'getRefreshToken' | 'onTokenRefreshed' | 'onAuthFailure'> {}

/** Vite/browser client — empty base URL uses the dev proxy. */
export function createBrowserApiConfig(
  baseUrl?: string,
  getAccessToken?: () => string | undefined | null,
  options?: BrowserApiOptions,
): ApiConfig {
  return {
    baseUrl: normalizeBaseUrl(baseUrl ?? API_DEFAULTS.browserBaseUrl),
    timeoutMs: API_DEFAULTS.timeoutMs,
    getAccessToken,
    ...options,
  };
}
