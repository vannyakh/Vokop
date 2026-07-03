import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkDatabaseHealth, connectDatabases, setupGracefulShutdown } from '@vokop/db';
import { toApiResponse, gatewayHealthResponseSchema } from '@vokop/api';
import { DEFAULT_DEV_URLS, DEV_PORTS } from '@vokop/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = Number(process.env.GATEWAY_PORT ?? DEV_PORTS.gateway);
const VIDEO_TOOLS_URL = process.env.VIDEO_TOOLS_URL ?? DEFAULT_DEV_URLS.videoTools;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL ?? DEFAULT_DEV_URLS.auth;
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? DEFAULT_DEV_URLS.web;

const app = express();

app.use(
  cors({
    origin: [WEB_ORIGIN, process.env.ADMIN_ORIGIN ?? DEFAULT_DEV_URLS.admin].filter(Boolean),
    credentials: true,
  }),
);

app.get('/api/v1/health', async (_req, res) => {
  const databases = await checkDatabaseHealth();
  const ok = databases.mongo && databases.redis;

  const payload = toApiResponse(gatewayHealthResponseSchema, {
    status: ok ? 'ok' : 'degraded',
    service: 'gateway',
    databases,
    timestamp: new Date().toISOString(),
  });

  res.status(ok ? 200 : 503).json(payload);
});

app.use(
  '/api/v1/video',
  createProxyMiddleware({
    target: VIDEO_TOOLS_URL,
    changeOrigin: true,
    pathRewrite: { '^/': '/' },
  }),
);

app.use(
  '/api/v1/media',
  createProxyMiddleware({
    target: VIDEO_TOOLS_URL,
    changeOrigin: true,
    pathRewrite: { '^/': '/media/' },
  }),
);

app.use(
  '/api/v1/auth',
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/': '/auth/' },
  }),
);

app.use(
  '/api/v1/admin',
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/': '/admin/' },
  }),
);

app.use(
  '/api/v1/projects',
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/': '/projects/' },
  }),
);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

async function start() {
  try {
    await connectDatabases();
    console.log('[gateway] connected to MongoDB and Redis');
  } catch (err) {
    console.error('[gateway] database connection failed:', err);
    process.exit(1);
  }

  setupGracefulShutdown();

  const server = app.listen(PORT, () => {
    console.log(`[gateway] http://localhost:${PORT}`);
    console.log(`[gateway] proxying /api/v1/video -> ${VIDEO_TOOLS_URL}`);
    console.log(`[gateway] proxying /api/v1/media -> ${VIDEO_TOOLS_URL}/media`);
    console.log(`[gateway] proxying /api/v1/auth -> ${AUTH_SERVICE_URL}/auth`);
    console.log(`[gateway] proxying /api/v1/admin -> ${AUTH_SERVICE_URL}/admin`);
    console.log(`[gateway] proxying /api/v1/projects -> ${AUTH_SERVICE_URL}/projects`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[gateway] Port ${PORT} is already in use. Run: pnpm stop`);
      process.exit(1);
    }
    throw err;
  });
}

void start();
