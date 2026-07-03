/**
 * Redis pub/sub subscriber for job progress events.
 * Subscribes to the "job:progress" channel published by video-tools workers
 * and forwards each message to the matching WebSocket room.
 */

import { createClient } from 'redis';
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

let _subscriber: ReturnType<typeof createClient> | null = null;

/**
 * Start a dedicated Redis subscriber connection and listen for progress events.
 * Uses a separate client from the main @vokop/db connection to avoid
 * blocking the main event loop while subscribed.
 */
export async function startProgressSubscriber(redisUrl: string): Promise<void> {
  _subscriber = createClient({ url: redisUrl });

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
