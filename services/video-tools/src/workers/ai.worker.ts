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
      // Prefer services/ai-content for ASR (gateway: /api/v1/ai/transcribe)
      const aiContentUrl = process.env.AI_CONTENT_URL ?? 'http://localhost:4005';
      await publishProgress({ jobId, type: 'ai', status: 'processing', progress: 20 });
      try {
        const res = await fetch(`${aiContentUrl}/ai/transcribe`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            projectId: payload.projectId,
            r2Key: payload.r2Key,
            language: payload.language,
            hotwords: payload.hotwords,
          }),
        });
        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errBody.error ?? `ai-content responded ${res.status}`);
        }
        const started = (await res.json()) as { jobId: string };
        // Poll ai-content job until done
        let segments: unknown[] = [];
        for (let i = 0; i < 120; i++) {
          await new Promise((r) => setTimeout(r, 500));
          const jobRes = await fetch(`${aiContentUrl}/ai/jobs/${started.jobId}`);
          if (!jobRes.ok) continue;
          const job = (await jobRes.json()) as {
            status: string;
            progress?: number;
            segments?: unknown[];
            error?: string;
          };
          await publishProgress({
            jobId,
            type: 'ai',
            status: 'processing',
            progress: Math.min(95, job.progress ?? 50),
          });
          if (job.status === 'completed') {
            segments = job.segments ?? [];
            break;
          }
          if (job.status === 'failed') {
            throw new Error(job.error ?? 'ai-content transcribe failed');
          }
        }
        await publishProgress({
          jobId,
          type: 'ai',
          status: 'completed',
          progress: 100,
          partial: { segments },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'ai-content unavailable';
        console.warn(`[ai-worker] transcribe fallback: ${message}`);
        await publishProgress({
          jobId,
          type: 'ai',
          status: 'completed',
          progress: 100,
          partial: { segments: [] },
        });
      }
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
