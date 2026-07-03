/**
 * Publish job progress to the Redis "job:progress" pub/sub channel.
 * The gateway subscribes and pushes updates to connected WebSocket clients.
 */

import { getRedis } from '@vokop/db';

export const JOB_PROGRESS_CHANNEL = 'job:progress';

export interface JobProgressEvent {
  jobId: string;
  type: 'ingest' | 'render' | 'ai';
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  /** Optional partial result (e.g. thumbnails array for ingest) */
  partial?: unknown;
  error?: string;
}

export async function publishProgress(event: JobProgressEvent): Promise<void> {
  try {
    await getRedis().publish(JOB_PROGRESS_CHANNEL, JSON.stringify(event));
  } catch {
    // Non-fatal — progress push best-effort
  }
}
