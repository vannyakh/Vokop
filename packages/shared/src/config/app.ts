import { DEFAULT_DEV_URLS } from './ports.js';

export const APP_NAME = 'Vokop Studio';

export const APP_STORAGE_KEYS = {
  settings: 'vokop-settings',
  auth: 'vokop-auth',
  adminAuth: 'vokop-admin-auth',
} as const;

/** Main studio app routes (apps/web). */
export const ROUTES = {
  home: '/',
  studio: '/studio',
  studioProject: '/studio/:projectId',
} as const;

/** Standalone admin app routes (apps/admin). */
export const ADMIN_ROUTES = {
  home: '/',
  users: '/users',
  rbac: '/rbac',
  menus: '/menus',
  activity: '/activity',
} as const;

export const DEFAULT_ADMIN_APP_URL = DEFAULT_DEV_URLS.admin;
export const DEFAULT_WEB_APP_URL = DEFAULT_DEV_URLS.web;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
export type AdminRoute = (typeof ADMIN_ROUTES)[keyof typeof ADMIN_ROUTES];
