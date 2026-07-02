export const APP_NAME = 'Vokop Studio';

export const APP_STORAGE_KEYS = {
  settings: 'vokop-settings',
  auth: 'vokop-auth',
} as const;

export const ROUTES = {
  home: '/',
  studio: '/studio',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
