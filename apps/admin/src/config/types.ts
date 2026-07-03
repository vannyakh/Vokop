import type { ReactNode } from 'react';

export type AdminNavSubItem = {
  label: string;
  tabId: string;
  type: string;
  path?: string;
};

export type AdminNavItem = {
  id: string;
  label: string;
  icon: ReactNode;
  type: string;
  path?: string;
  badge?: string;
  isGroup?: boolean;
  subItems?: AdminNavSubItem[];
};

export type AdminNavSection = {
  category: string;
  items: AdminNavItem[];
};

export type AdminBrandConfig = {
  name: string;
  highlight?: string;
  logoSrc?: string;
  logoAlt?: string;
};

export type AdminShellConfig = {
  brand: AdminBrandConfig;
  nav: AdminNavSection[];
  /** Tab-based navigation (template demo) or router paths. */
  mode: 'tabs' | 'router';
  /** Link back to the main product app. */
  webAppUrl?: string;
};
