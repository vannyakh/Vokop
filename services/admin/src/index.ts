import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDatabaseHealth, connectDatabases, setupGracefulShutdown } from '@vokop/db';
import { healthResponseSchema, toApiResponse } from '@vokop/api';
import { DEV_PORTS } from '@vokop/shared';
import { seedAdminData } from './lib/seed.js';
import { createAdminRouter } from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = Number(process.env.ADMIN_SERVICE_PORT ?? DEV_PORTS.adminService);

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', async (_req, res) => {
  const databases = await checkDatabaseHealth();
  const ok = databases.mongo && databases.redis;
  res.status(ok ? 200 : 503).json(
    toApiResponse(healthResponseSchema, {
      status: ok ? 'ok' : 'degraded',
      service: 'admin',
      databases,
      timestamp: new Date().toISOString(),
    }),
  );
});

app.use('/admin', createAdminRouter());

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

async function start() {
  try {
    await connectDatabases();
    await seedAdminData();
    console.log('[admin] connected to MongoDB and Redis');
  } catch (err) {
    console.error('[admin] startup failed:', err);
    process.exit(1);
  }

  setupGracefulShutdown();

  const server = app.listen(PORT, () => {
    console.log(`[admin] http://localhost:${PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[admin] Port ${PORT} is already in use. Run: pnpm stop`);
      process.exit(1);
    }
    throw err;
  });
}

void start();
