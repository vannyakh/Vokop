import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const schema = z.object({
  // Server
  VIDEO_TOOLS_PORT: z.coerce.number().default(4001),

  // Databases
  MONGODB_URI: z.string().default('mongodb://vokop:vokop@localhost:27017/vokop?authSource=admin'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  /** Dedicated Redis URL for BullMQ queues — falls back to REDIS_URL. */
  BULL_REDIS_URL: z.string().optional(),

  // Upload / session
  MAX_UPLOAD_MB: z.coerce.number().default(512),
  SESSION_TTL_SEC: z.coerce.number().default(86_400),
  SESSIONS_DIR: z.string().default('/tmp/vokop-sessions'),

  // Jobs
  MAX_FFMPEG_JOBS: z.coerce.number().default(2),
  JOB_TTL_SEC: z.coerce.number().default(3600),
  CACHE_TTL_SEC: z.coerce.number().default(3600),

  // Stock media APIs
  PIXABAY_API_KEY: z.string().optional(),
  GIPHY_API_KEY: z.string().optional(),
  MEDIA_CACHE_TTL_SEC: z.coerce.number().default(300),

  // Cloudflare R2 (S3-compatible)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  /** Public CDN base URL for R2 objects (e.g. https://pub-xxx.r2.dev) */
  R2_PUBLIC_URL: z.string().optional(),

  // Auth (for JWT verification in preHandlers)
  JWT_ACCESS_SECRET: z.string().default('change-me-access-secret'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('[video-tools] Invalid environment:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = parsed.data;

export const PORT = config.VIDEO_TOOLS_PORT;
export const bullRedisUrl = config.BULL_REDIS_URL ?? config.REDIS_URL;
