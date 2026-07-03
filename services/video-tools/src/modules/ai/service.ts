import { randomUUID } from 'node:crypto';
import { getAiQueue } from '../../queue/queues.js';
import type { AiPayload } from '../../queue/payloads.js';

export interface AiJobRef {
  jobId: string;
  task: AiPayload['task'];
  status: 'queued';
}

export async function enqueueTranscribe(
  projectId: string,
  ownerId: string,
  r2Key: string,
  language?: string,
  hotwords?: string,
): Promise<AiJobRef> {
  const jobId = randomUUID();
  await getAiQueue().add('transcribe', {
    task: 'transcribe',
    jobId,
    projectId,
    ownerId,
    r2Key,
    language,
    hotwords,
  });
  return { jobId, task: 'transcribe', status: 'queued' };
}

export async function enqueueTts(
  projectId: string,
  ownerId: string,
  text: string,
  voice: string,
  outputR2Key: string,
): Promise<AiJobRef> {
  const jobId = randomUUID();
  await getAiQueue().add('tts', {
    task: 'tts',
    jobId,
    projectId,
    ownerId,
    text,
    voice,
    outputR2Key,
  });
  return { jobId, task: 'tts', status: 'queued' };
}

export async function enqueueTranslate(
  projectId: string,
  ownerId: string,
  segments: { start: number; end: number; text: string }[],
  targetLanguage: string,
): Promise<AiJobRef> {
  const jobId = randomUUID();
  await getAiQueue().add('translate', {
    task: 'translate',
    jobId,
    projectId,
    ownerId,
    segments,
    targetLanguage,
  });
  return { jobId, task: 'translate', status: 'queued' };
}
