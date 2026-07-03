import { Queue } from 'bullmq';
import { getBullConnection } from './connection.js';
import type { IngestPayload, RenderPayload, AiPayload } from './payloads.js';

export const QUEUE_NAMES = {
  ingest: 'ingest',
  render: 'render',
  ai: 'ai',
} as const;

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { age: 3600, count: 100 },
  removeOnFail: { age: 86400 },
};

let _ingestQueue: Queue<IngestPayload> | null = null;
let _renderQueue: Queue<RenderPayload> | null = null;
let _aiQueue: Queue<AiPayload> | null = null;

export function getIngestQueue(): Queue<IngestPayload> {
  if (!_ingestQueue) {
    _ingestQueue = new Queue<IngestPayload>(QUEUE_NAMES.ingest, {
      connection: getBullConnection(),
      defaultJobOptions,
    });
  }
  return _ingestQueue;
}

export function getRenderQueue(): Queue<RenderPayload> {
  if (!_renderQueue) {
    _renderQueue = new Queue<RenderPayload>(QUEUE_NAMES.render, {
      connection: getBullConnection(),
      defaultJobOptions: { ...defaultJobOptions, attempts: 1 },
    });
  }
  return _renderQueue;
}

export function getAiQueue(): Queue<AiPayload> {
  if (!_aiQueue) {
    _aiQueue = new Queue<AiPayload>(QUEUE_NAMES.ai, {
      connection: getBullConnection(),
      defaultJobOptions,
    });
  }
  return _aiQueue;
}

export async function closeQueues(): Promise<void> {
  await Promise.all([
    _ingestQueue?.close(),
    _renderQueue?.close(),
    _aiQueue?.close(),
  ]);
}
