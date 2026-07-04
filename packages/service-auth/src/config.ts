/** Shared JWT access-token config for all services that verify Bearer tokens. */
export const SERVICE_AUTH_CONFIG = {
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
} as const;
