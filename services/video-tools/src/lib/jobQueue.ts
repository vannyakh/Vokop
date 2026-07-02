import { randomUUID } from 'node:crypto';
import { getMongo, getRedis } from '@vokop/db';
import type { JobStatus, VideoJobResponse } from '@vokop/api';

const JOB_PREFIX = 'vokop:job:';
const JOB_TTL_SEC = Number(process.env.JOB_TTL_SEC ?? 3600);
const MAX_CONCURRENT_JOBS = Number(process.env.MAX_FFMPEG_JOBS ?? 2);

type JobHandler = () => Promise<void>;

const queue: { jobId: string; handler: JobHandler }[] = [];
let activeJobs = 0;

export async function createJobRecord(
  type: VideoJobResponse['type'],
  sessionId?: string,
): Promise<VideoJobResponse> {
  const now = new Date().toISOString();
  const job: VideoJobResponse = {
    jobId: randomUUID(),
    type,
    status: 'queued',
    progress: 0,
    sessionId,
    createdAt: now,
    updatedAt: now,
  };

  await saveJob(job);
  return job;
}

export async function saveJob(job: VideoJobResponse): Promise<void> {
  job.updatedAt = new Date().toISOString();
  await getRedis().setEx(`${JOB_PREFIX}${job.jobId}`, JOB_TTL_SEC, JSON.stringify(job));
}

export async function getJob(jobId: string): Promise<VideoJobResponse | null> {
  const raw = await getRedis().get(`${JOB_PREFIX}${jobId}`);
  if (!raw) return null;
  return JSON.parse(raw) as VideoJobResponse;
}

export async function updateJob(
  jobId: string,
  patch: Partial<Pick<VideoJobResponse, 'status' | 'progress' | 'thumbnails' | 'result' | 'error'>>,
): Promise<VideoJobResponse | null> {
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
  while (activeJobs < MAX_CONCURRENT_JOBS && queue.length > 0) {
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
    const message = err instanceof Error ? err.message : 'Job failed';
    await updateJob(jobId, { status: 'failed', progress: 100, error: message });
  }
}

export async function logVideoJob(
  type: string,
  filename: string,
  size: number,
  status: 'completed' | 'failed',
  meta?: Record<string, unknown>,
): Promise<void> {
  await getMongo().collection('video_jobs').insertOne({
    type,
    filename,
    size,
    status,
    meta,
    createdAt: new Date(),
  });
}

export type { JobStatus };
