/**
 * Render worker — processes export jobs:
 *   1. Resolve asset R2 keys from timeline snapshot
 *   2. Download all required assets to tmp
 *   3. Compile timeline via `@vokop/pipeline`
 *   4. Run ffmpeg → output file
 *   5. Upload output to R2
 *   6. Update renderJob doc + publish progress
 */

import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { Worker, type Job } from 'bullmq';
import { referencedAssetIds, type AssetMediaFlags } from '@vokop/pipeline';
import { getBullConnection } from '../queue/connection.js';
import { QUEUE_NAMES } from '../queue/queues.js';
import { publishProgress } from '../queue/progress.js';
import { getObject, putObject, renderOutputKey, publicUrl } from '../storage/r2.js';
import { renderJobs, assets } from '../db/collections.js';
import {
  extensionForFilename,
  renderTimeline,
  snapshotToTimeline,
  withTmpDir,
  type ExportResolution,
} from './pipeline/index.js';
import type { RenderPayload } from '../queue/payloads.js';

async function processRender(job: Job<RenderPayload>): Promise<void> {
  const { jobId, ownerId, timelineSnapshot, exportSettings } = job.data;
  const { format, resolution, fps } = exportSettings;

  await renderJobs().updateOne({ jobId }, { $set: { status: 'processing', progress: 5, updatedAt: new Date() } });
  await publishProgress({ jobId, type: 'render', status: 'processing', progress: 5 });

  await withTmpDir('vokop-render-', async (tmpDir) => {
    const snapshot = timelineSnapshot as Record<string, unknown>;
    const timeline = snapshotToTimeline(snapshot, {
      fps,
      resolution: resolution as ExportResolution,
    });

    const assetIds = referencedAssetIds(timeline);
    const assetPaths: Record<string, string> = {};
    const assetFlags: Record<string, AssetMediaFlags> = {};

    for (const assetId of assetIds) {
      const asset = await assets().findOne({ assetId });
      if (!asset?.r2Key) {
        throw new Error(`Missing asset "${assetId}" for render`);
      }

      const buffer = await getObject(asset.r2Key);
      const ext = extensionForFilename(asset.filename);
      const localPath = path.join(tmpDir, `${assetId}.${ext}`);
      await writeFile(localPath, buffer);
      assetPaths[assetId] = localPath;

      const kind = String(asset.kind ?? 'video');
      assetFlags[assetId] = {
        hasVideo: kind === 'video' || kind === 'image',
        hasAudio: kind === 'audio' || kind === 'video',
      };
    }

    await publishProgress({ jobId, type: 'render', status: 'processing', progress: 30 });

    const outputPath = path.join(tmpDir, `output.${format}`);
    await renderTimeline({
      timeline,
      assetPaths,
      assetFlags,
      outputPath,
      format,
      onProgress: async ({ percent }) => {
        const pct = 30 + Math.round(percent * 0.55);
        await publishProgress({ jobId, type: 'render', status: 'processing', progress: pct });
        await renderJobs().updateOne({ jobId }, { $set: { progress: pct, updatedAt: new Date() } });
      },
    });

    await publishProgress({ jobId, type: 'render', status: 'processing', progress: 90 });

    const outputBuffer = await readFile(outputPath);
    const r2Key = renderOutputKey(ownerId, jobId, format);
    await putObject(r2Key, outputBuffer, format === 'mp4' ? 'video/mp4' : 'video/webm');
    const url = await publicUrl(r2Key);

    await renderJobs().updateOne(
      { jobId },
      { $set: { status: 'completed', progress: 100, outputKey: r2Key, outputUrl: url, updatedAt: new Date() } },
    );
    await publishProgress({ jobId, type: 'render', status: 'completed', progress: 100, partial: { outputUrl: url } });
  });
}

export function createRenderWorker() {
  return new Worker<RenderPayload>(
    QUEUE_NAMES.render,
    async (job) => {
      try {
        await processRender(job);
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Render failed';
        await renderJobs().updateOne(
          { jobId: job.data.jobId },
          { $set: { status: 'failed', error, updatedAt: new Date() } },
        );
        await publishProgress({ jobId: job.data.jobId, type: 'render', status: 'failed', progress: 100, error });
        throw err;
      }
    },
    {
      connection: getBullConnection(),
      concurrency: 1,
    },
  );
}
