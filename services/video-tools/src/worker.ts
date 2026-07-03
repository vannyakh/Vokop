/**
 * Worker entry point — starts BullMQ consumers only (no Fastify / HTTP server).
 * Run alongside the API process: pnpm dev:worker
 */

import './config.js'; // validate env first
import { connectDatabases, setupGracefulShutdown } from '@vokop/db';
import { ensureIndexes } from './db/indexes.js';
import { closeBullConnection } from './queue/connection.js';
import { closeQueues } from './queue/queues.js';
import { createIngestWorker } from './workers/ingest.worker.js';
import { createRenderWorker } from './workers/render.worker.js';
import { createAiWorker } from './workers/ai.worker.js';

async function startWorker() {
  try {
    await connectDatabases();
    console.log('[worker] connected to MongoDB and Redis');
    await ensureIndexes();
    console.log('[worker] DB indexes ensured');
  } catch (err) {
    console.error('[worker] database connection failed:', err);
    process.exit(1);
  }

  const ingestWorker = createIngestWorker();
  const renderWorker = createRenderWorker();
  const aiWorker = createAiWorker();

  ingestWorker.on('completed', (job) => console.log(`[worker] ingest ${job.id} completed`));
  ingestWorker.on('failed', (job, err) => console.error(`[worker] ingest ${job?.id} failed:`, err.message));
  renderWorker.on('completed', (job) => console.log(`[worker] render ${job.id} completed`));
  renderWorker.on('failed', (job, err) => console.error(`[worker] render ${job?.id} failed:`, err.message));
  aiWorker.on('completed', (job) => console.log(`[worker] ai ${job.id} completed`));
  aiWorker.on('failed', (job, err) => console.error(`[worker] ai ${job?.id} failed:`, err.message));

  console.log('[worker] listening on queues: ingest, render, ai');

  setupGracefulShutdown();

  process.on('SIGTERM', async () => {
    console.log('[worker] shutting down...');
    await Promise.all([
      ingestWorker.close(),
      renderWorker.close(),
      aiWorker.close(),
      closeQueues(),
      closeBullConnection(),
    ]);
    process.exit(0);
  });
}

void startWorker();
