import type { AdminShellConfig } from '@/config/types';
import { vokopAdminNav } from '@/config/navPresets';
import { DEFAULT_WEB_APP_URL } from '@vokop/shared';

export function createAdminShellConfig(): AdminShellConfig {
  return {
    ...vokopAdminNav,
    webAppUrl: import.meta.env.VITE_WEB_APP_URL ?? DEFAULT_WEB_APP_URL,
  };
}

export type { AdminShellConfig, AdminNavItem, AdminNavSection } from '@/config/types';
export { vokopAdminNav } from '@/config/navPresets';
