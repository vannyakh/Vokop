/**
 * ai-content — FunClip-inspired AI generate-content service.
 * Owns ASR/subtitles, LLM clip assist, and the studio agent.
 */

import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDatabaseHealth, connectDatabases, setupGracefulShutdown } from '@vokop/db';
import { healthResponseSchema, toApiResponse } from '@vokop/api';
import { DEV_PORTS } from '@vokop/shared';
import { config } from './config.js';
import { describeDefaultLlm } from './llm/index.js';
import { createAiRouter } from './routes/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = config.port || DEV_PORTS.aiContent;

const app = express();
app.use(express.json({ limit: '32mb' }));

app.get('/health', async (_req, res) => {
  const databases = await checkDatabaseHealth();
  const ok = databases.mongo && databases.redis;
  res.status(ok ? 200 : 503).json(
    toApiResponse(healthResponseSchema, {
      status: ok ? 'ok' : 'degraded',
      service: 'ai-content',
      databases,
      timestamp: new Date().toISOString(),
    }),
  );
});

app.use('/ai', createAiRouter());

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

async function start() {
  try {
    await connectDatabases();
    console.log('[ai-content] connected to MongoDB and Redis');
  } catch (err) {
    console.error('[ai-content] startup failed:', err);
    process.exit(1);
  }

  setupGracefulShutdown();

  const server = app.listen(PORT, () => {
    console.log(`[ai-content] http://localhost:${PORT} (llm: ${describeDefaultLlm()})`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[ai-content] Port ${PORT} is already in use. Run: pnpm stop`);
      process.exit(1);
    }
    throw err;
  });
}

void start();
