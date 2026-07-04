import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_DEV_URLS, DEV_PORTS } from '@vokop/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const gatewayConfig = {
  port: Number(process.env.GATEWAY_PORT ?? DEV_PORTS.gateway),
  videoToolsUrl: process.env.VIDEO_TOOLS_URL ?? DEFAULT_DEV_URLS.videoTools,
  authServiceUrl: process.env.AUTH_SERVICE_URL ?? DEFAULT_DEV_URLS.auth,
  studioServiceUrl: process.env.STUDIO_SERVICE_URL ?? DEFAULT_DEV_URLS.studio,
  adminServiceUrl: process.env.ADMIN_SERVICE_URL ?? DEFAULT_DEV_URLS.adminService,
  aiContentUrl: process.env.AI_CONTENT_URL ?? DEFAULT_DEV_URLS.aiContent,
  webOrigin: process.env.WEB_ORIGIN ?? DEFAULT_DEV_URLS.web,
  adminOrigin: process.env.ADMIN_ORIGIN ?? DEFAULT_DEV_URLS.admin,
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
} as const;
