import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkDatabaseHealth, connectDatabases, setupGracefulShutdown } from '@vokop/db';
import { healthResponseSchema, toApiResponse } from '@vokop/api';
import { seedAuthData } from './lib/seed.js';
import { createAuthRouter } from './routes/auth.js';
import { createAdminRouter } from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = Number(process.env.AUTH_PORT ?? 4002);

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', async (_req, res) => {
  const databases = await checkDatabaseHealth();
  const ok = databases.mongo && databases.redis;
  const payload = toApiResponse(healthResponseSchema, {
    status: ok ? 'ok' : 'degraded',
    service: 'auth',
    databases,
    timestamp: new Date().toISOString(),
  });
  res.status(ok ? 200 : 503).json(payload);
});

app.use('/auth', createAuthRouter());
app.use('/admin', createAdminRouter());

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

async function start() {
  try {
    await connectDatabases();
    await seedAuthData();
    console.log('[auth] connected to MongoDB and Redis');
  } catch (err) {
    console.error('[auth] startup failed:', err);
    process.exit(1);
  }

  setupGracefulShutdown();

  const server = app.listen(PORT, () => {
    console.log(`[auth] http://localhost:${PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[auth] Port ${PORT} is already in use. Run: pnpm stop`);
      process.exit(1);
    }
    throw err;
  });
}

void start();
