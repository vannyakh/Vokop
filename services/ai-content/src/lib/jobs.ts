import { randomUUID } from 'node:crypto';
import { getRedis } from '@vokop/db';
import type { AiJobResponse, AiJobType } from '@vokop/api';
import { config } from '../config.js';

const JOB_PREFIX = 'vokop:ai-job:';

type JobHandler = () => Promise<void>;

const queue: { jobId: string; handler: JobHandler }[] = [];
let activeJobs = 0;

export async function createJobRecord(
  type: AiJobType,
  meta?: Pick<AiJobResponse, 'sessionId' | 'projectId'>,
): Promise<AiJobResponse> {
  const now = new Date().toISOString();
  const job: AiJobResponse = {
    jobId: randomUUID(),
    type,
    status: 'queued',
    progress: 0,
    sessionId: meta?.sessionId,
    projectId: meta?.projectId,
    createdAt: now,
    updatedAt: now,
  };
  await saveJob(job);
  return job;
}

export async function saveJob(job: AiJobResponse): Promise<void> {
  job.updatedAt = new Date().toISOString();
  await getRedis().setEx(`${JOB_PREFIX}${job.jobId}`, config.jobTtlSec, JSON.stringify(job));
}

export async function getJob(jobId: string): Promise<AiJobResponse | null> {
  const raw = await getRedis().get(`${JOB_PREFIX}${jobId}`);
  if (!raw) return null;
  return JSON.parse(raw) as AiJobResponse;
}

export async function updateJob(
  jobId: string,
  patch: Partial<
    Pick<
      AiJobResponse,
      | 'status'
      | 'progress'
      | 'segments'
      | 'transcript'
      | 'srt'
      | 'clips'
      | 'message'
      | 'audioBase64'
      | 'actions'
      | 'result'
      | 'error'
    >
  >,
): Promise<AiJobResponse | null> {
  const job = await getJob(jobId);
  if (!job) return null;
  Object.assign(job, patch);
  await saveJob(job);
  return job;
}

export function enqueueJob(jobId: string, handler: JobHandler): void {
  queue.push({ jobId, handler });
  void drainQueue();
}

async function drainQueue(): Promise<void> {
  while (activeJobs < config.maxConcurrentJobs && queue.length > 0) {
    const next = queue.shift();
    if (!next) return;

    activeJobs += 1;
    void runJob(next.jobId, next.handler).finally(() => {
      activeJobs -= 1;
      void drainQueue();
    });
  }
}

async function runJob(jobId: string, handler: JobHandler): Promise<void> {
  await updateJob(jobId, { status: 'processing', progress: 5 });

  try {
    await handler();
    const job = await getJob(jobId);
    if (job && job.status !== 'failed') {
      await updateJob(jobId, { status: 'completed', progress: 100 });
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'AI job failed';
    await updateJob(jobId, { status: 'failed', progress: 100, error });
  }
}
