export const AUTH_CONFIG = {
  accessTtlSec: Number(process.env.JWT_ACCESS_TTL_SEC ?? 900),
  refreshTtlSec: Number(process.env.JWT_REFRESH_TTL_SEC ?? 604800),
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
  adminSeedEmail: process.env.ADMIN_SEED_EMAIL ?? 'admin@vokop.app',
  adminSeedPassword: process.env.ADMIN_SEED_PASSWORD ?? 'admin123456',
  adminSeedName: process.env.ADMIN_SEED_NAME ?? 'Platform Admin',
};
