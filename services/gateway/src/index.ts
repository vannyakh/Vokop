import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'node:http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDatabaseHealth, connectDatabases, setupGracefulShutdown } from '@vokop/db';
import { toApiResponse, gatewayHealthResponseSchema } from '@vokop/api';
import { DEFAULT_DEV_URLS, DEV_PORTS } from '@vokop/shared';
import { createWsServer } from './ws/server.js';
import { startProgressSubscriber, stopProgressSubscriber } from './ws/progress.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = Number(process.env.GATEWAY_PORT ?? DEV_PORTS.gateway);
const VIDEO_TOOLS_URL = process.env.VIDEO_TOOLS_URL ?? DEFAULT_DEV_URLS.videoTools;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL ?? DEFAULT_DEV_URLS.auth;
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? DEFAULT_DEV_URLS.web;
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

const app = express();

app.use(
  cors({
    origin: [WEB_ORIGIN, process.env.ADMIN_ORIGIN ?? DEFAULT_DEV_URLS.admin].filter(Boolean),
    credentials: true,
  }),
);

// ─── Health ───────────────────────────────────────────────────────────────────
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

// ─── Proxy routes ─────────────────────────────────────────────────────────────
app.use(
  '/api/v1/video',
  createProxyMiddleware({ target: VIDEO_TOOLS_URL, changeOrigin: true, pathRewrite: { '^/': '/' } }),
);

app.use(
  '/api/v1/media',
  createProxyMiddleware({ target: VIDEO_TOOLS_URL, changeOrigin: true, pathRewrite: { '^/api/v1/media': '/media' } }),
);

app.use(
  '/api/v1/stock',
  createProxyMiddleware({ target: VIDEO_TOOLS_URL, changeOrigin: true, pathRewrite: { '^/api/v1/stock': '/stock' } }),
);

app.use(
  '/api/v1/presets',
  createProxyMiddleware({ target: VIDEO_TOOLS_URL, changeOrigin: true, pathRewrite: { '^/api/v1/presets': '/presets' } }),
);

app.use(
  '/api/v1/assets',
  createProxyMiddleware({ target: VIDEO_TOOLS_URL, changeOrigin: true, pathRewrite: { '^/api/v1/assets': '/assets' } }),
);

app.use(
  '/api/v1/projects',
  createProxyMiddleware({ target: VIDEO_TOOLS_URL, changeOrigin: true, pathRewrite: { '^/api/v1/projects': '/projects' } }),
);

app.use(
  '/api/v1/export',
  createProxyMiddleware({ target: VIDEO_TOOLS_URL, changeOrigin: true, pathRewrite: { '^/api/v1/export': '' } }),
);

app.use(
  '/api/v1/ai',
  createProxyMiddleware({ target: VIDEO_TOOLS_URL, changeOrigin: true, pathRewrite: { '^/api/v1/ai': '/ai' } }),
);

app.use(
  '/api/v1/auth',
  createProxyMiddleware({ target: AUTH_SERVICE_URL, changeOrigin: true, pathRewrite: { '^/api/v1/auth': '/auth' } }),
);

app.use(
  '/api/v1/admin',
  createProxyMiddleware({ target: AUTH_SERVICE_URL, changeOrigin: true, pathRewrite: { '^/api/v1/admin': '/admin' } }),
);

app.use((_req, res) => { res.status(404).json({ error: 'Not found' }); });

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await connectDatabases();
    console.log('[gateway] connected to MongoDB and Redis');
  } catch (err) {
    console.error('[gateway] database connection failed:', err);
    process.exit(1);
  }

  // Start Redis pub/sub for job progress → WS broadcast
  await startProgressSubscriber(REDIS_URL);

  setupGracefulShutdown();

  // Create HTTP server explicitly to attach WebSocket server
  const httpServer = createServer(app);
  createWsServer(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`[gateway] http://localhost:${PORT}`);
    console.log(`[gateway] ws://localhost:${PORT}/ws`);
    console.log(`[gateway] proxying /api/v1/video -> ${VIDEO_TOOLS_URL}`);
    console.log(`[gateway] proxying /api/v1/projects -> ${VIDEO_TOOLS_URL}/projects`);
    console.log(`[gateway] proxying /api/v1/assets -> ${VIDEO_TOOLS_URL}/assets`);
    console.log(`[gateway] proxying /api/v1/ai -> ${VIDEO_TOOLS_URL}/ai`);
    console.log(`[gateway] proxying /api/v1/auth -> ${AUTH_SERVICE_URL}/auth`);
  });

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[gateway] Port ${PORT} is already in use. Run: pnpm stop`);
      process.exit(1);
    }
    throw err;
  });

  process.on('SIGTERM', async () => {
    await stopProgressSubscriber();
  });
}

void start();
