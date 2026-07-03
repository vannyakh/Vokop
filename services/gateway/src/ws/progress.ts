/**
 * Redis pub/sub subscriber for job progress events.
 * Subscribes to the "job:progress" channel published by video-tools workers
 * and forwards each message to the matching WebSocket room.
 *
 * Uses getRedis().duplicate() from @vokop/db to create a dedicated pub/sub
 * subscriber client — avoids adding a direct 'redis' dependency to the gateway.
 * duplicate() shares the same config but is a separate connection, which is
 * required because a subscribed client can only issue subscribe/unsubscribe commands.
 */

import { getRedis } from '@vokop/db';
import { broadcastJobProgress } from './server.js';

const JOB_PROGRESS_CHANNEL = 'job:progress';

export interface JobProgressEvent {
  jobId: string;
  type: 'ingest' | 'render' | 'ai';
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  partial?: unknown;
  error?: string;
}

let _subscriber: ReturnType<typeof getRedis> | null = null;

export async function startProgressSubscriber(_redisUrl: string): Promise<void> {
  // Duplicate the already-connected @vokop/db client for pub/sub use.
  _subscriber = getRedis().duplicate();

  _subscriber.on('error', (err: Error) => {
    console.error('[ws-progress] Redis subscriber error:', err.message);
  });

  await _subscriber.connect();

  await _subscriber.subscribe(JOB_PROGRESS_CHANNEL, (message) => {
    try {
      const event = JSON.parse(message) as JobProgressEvent;
      broadcastJobProgress(event.jobId, event);
    } catch {
      // ignore malformed messages
    }
  });

  console.log(`[ws-progress] subscribed to Redis channel "${JOB_PROGRESS_CHANNEL}"`);
}

export async function stopProgressSubscriber(): Promise<void> {
  if (_subscriber) {
    await _subscriber.unsubscribe(JOB_PROGRESS_CHANNEL).catch(() => undefined);
    await _subscriber.quit().catch(() => undefined);
    _subscriber = null;
  }
}
