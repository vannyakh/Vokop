/**
 * AI worker — handles async AI content jobs:
 *   - transcribe: Whisper-based ASR (placeholder for services/ai-content integration)
 *   - tts: Text-to-speech
 *   - translate: Segment translation
 *
 * Heavy AI workloads (Whisper / FunClip) are intended for services/ai-content.
 * This worker handles the queueing, status tracking, and result storage.
 */

import { Worker, type Job } from 'bullmq';
import { getBullConnection } from '../queue/connection.js';
import { QUEUE_NAMES } from '../queue/queues.js';
import { publishProgress } from '../queue/progress.js';
import type { AiPayload } from '../queue/payloads.js';

async function processAiJob(job: Job<AiPayload>): Promise<void> {
  const payload = job.data;
  const jobId = payload.jobId;

  await publishProgress({ jobId, type: 'ai', status: 'processing', progress: 5 });

  switch (payload.task) {
    case 'transcribe': {
      // Forward to ai-content service when available
      // TODO: POST to AI_CONTENT_URL/transcribe with r2Key
      await publishProgress({ jobId, type: 'ai', status: 'processing', progress: 50 });
      console.log(`[ai-worker] transcribe job ${jobId} — ai-content service not yet wired`);
      await publishProgress({ jobId, type: 'ai', status: 'completed', progress: 100, partial: { segments: [] } });
      break;
    }

    case 'tts': {
      // TODO: Call TTS provider (Gemini / Google Cloud TTS) and upload to R2
      await publishProgress({ jobId, type: 'ai', status: 'processing', progress: 50 });
      console.log(`[ai-worker] tts job ${jobId} — provider not yet configured`);
      await publishProgress({ jobId, type: 'ai', status: 'completed', progress: 100 });
      break;
    }

    case 'translate': {
      // TODO: Call translation provider with segments
      await publishProgress({ jobId, type: 'ai', status: 'processing', progress: 50 });
      console.log(`[ai-worker] translate job ${jobId} — provider not yet configured`);
      await publishProgress({ jobId, type: 'ai', status: 'completed', progress: 100, partial: { segments: payload.segments } });
      break;
    }
  }
}

export function createAiWorker() {
  return new Worker<AiPayload>(
    QUEUE_NAMES.ai,
    async (job) => {
      try {
        await processAiJob(job);
      } catch (err) {
        const error = err instanceof Error ? err.message : 'AI job failed';
        await publishProgress({ jobId: job.data.jobId, type: 'ai', status: 'failed', progress: 100, error });
        throw err;
      }
    },
    {
      connection: getBullConnection(),
      concurrency: 2,
    },
  );
}
