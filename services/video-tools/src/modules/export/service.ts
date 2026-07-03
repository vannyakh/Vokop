import { randomUUID } from 'node:crypto';
import { renderJobs } from '../../db/collections.js';
import type { RenderJobDoc } from '../../db/collections.js';
import { getRenderQueue } from '../../queue/queues.js';
import type { ExportSettings } from '../../queue/payloads.js';

export async function startExport(
  projectId: string,
  ownerId: string,
  timelineSnapshot: Record<string, unknown>,
  exportSettings: Partial<ExportSettings> = {},
): Promise<RenderJobDoc> {
  const jobId = randomUUID();
  const settings: ExportSettings = {
    format: exportSettings.format ?? 'mp4',
    resolution: exportSettings.resolution ?? '1080p',
    fps: exportSettings.fps ?? 30,
  };

  const now = new Date();
  const doc: RenderJobDoc = {
    jobId,
    projectId,
    ownerId,
    status: 'queued',
    progress: 0,
    timelineSnapshot,
    exportSettings: settings,
    createdAt: now,
    updatedAt: now,
  };

  await renderJobs().insertOne(doc);

  const bullJob = await getRenderQueue().add('render', {
    jobId,
    projectId,
    ownerId,
    timelineSnapshot,
    exportSettings: settings,
  });

  await renderJobs().updateOne({ jobId }, { $set: { bullJobId: bullJob.id } });

  return doc;
}

export async function getRenderJob(jobId: string, ownerId: string): Promise<RenderJobDoc | null> {
  return renderJobs().findOne({ jobId, ownerId });
}

export async function listRenderJobs(projectId: string, ownerId: string): Promise<RenderJobDoc[]> {
  return renderJobs()
    .find({ projectId, ownerId }, { sort: { createdAt: -1 }, limit: 20 })
    .toArray();
}
