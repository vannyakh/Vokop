export const APP_NAME = 'Vokop Studio';

export const APP_STORAGE_KEYS = {
  settings: 'vokop-settings',
  auth: 'vokop-auth',
} as const;

export const ROUTES = {
  home: '/',
  studio: '/studio',
  admin: '/admin',
  adminUsers: '/admin/users',
  adminRbac: '/admin/rbac',
  adminMenus: '/admin/menus',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
