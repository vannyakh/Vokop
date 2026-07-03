import { DEFAULT_ADMIN_APP_URL } from '@vokop/shared';

export function getAdminAppUrl(): string {
  return import.meta.env.VITE_ADMIN_APP_URL ?? DEFAULT_ADMIN_APP_URL;
}
