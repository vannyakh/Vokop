export const ROUTES = {
  home: '/',
  studio: '/studio',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
