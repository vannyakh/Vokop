/**
 * Render worker — processes export jobs:
 *   1. Resolve asset R2 keys from timeline snapshot
 *   2. Download all required assets to tmp
 *   3. Build filter_complex from timeline
 *   4. Run ffmpeg → output file
 *   5. Upload output to R2
 *   6. Update renderJob doc + publish progress
 */

import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { Worker, type Job } from 'bullmq';
import { getBullConnection } from '../queue/connection.js';
import { QUEUE_NAMES } from '../queue/queues.js';
import { publishProgress } from '../queue/progress.js';
import { getObject, putObject, renderOutputKey, publicUrl } from '../storage/r2.js';
import { renderJobs, assets } from '../db/collections.js';
import { buildFiltergraph, type TimelineClip } from './pipeline/filtergraph.js';
import { renderTimeline } from './pipeline/segments.js';
import { extensionForFilename } from './pipeline/ffmpeg.js';
import { withTmpDir } from './pipeline/tmp.js';
import type { RenderPayload } from '../queue/payloads.js';

async function processRender(job: Job<RenderPayload>): Promise<void> {
  const { jobId, projectId, ownerId, timelineSnapshot, exportSettings } = job.data;
  const { format, resolution, fps } = exportSettings;

  await renderJobs().updateOne({ jobId }, { $set: { status: 'processing', progress: 5, updatedAt: new Date() } });
  await publishProgress({ jobId, type: 'render', status: 'processing', progress: 5 });

  await withTmpDir('vokop-render-', async (tmpDir) => {
    // 1. Extract clips from timeline snapshot
    const rawClips = (timelineSnapshot.clips ?? []) as Array<Record<string, unknown>>;

    // 2. Download assets + build TimelineClip[]
    const clips: TimelineClip[] = [];
    for (const raw of rawClips) {
      const assetId = raw.assetId as string | undefined;
      if (!assetId) continue;

      const asset = await assets().findOne({ assetId });
      if (!asset?.r2Key) continue;

      const buffer = await getObject(asset.r2Key);
      const ext = extensionForFilename(asset.filename);
      const localPath = path.join(tmpDir, `${assetId}.${ext}`);
      await writeFile(localPath, buffer);

      clips.push({
        id: String(raw.id ?? assetId),
        kind: asset.kind as TimelineClip['kind'],
        src: localPath,
        startAtSec: Number(raw.startAtSec ?? 0),
        inPointSec: Number(raw.inPointSec ?? 0),
        durationSec: Number(raw.durationSec ?? asset.probe?.duration ?? 10),
        track: Number(raw.track ?? 0),
        ffmpegFilter: raw.ffmpegFilter as string | undefined,
        volume: raw.volume as number | undefined,
      });
    }

    await publishProgress({ jobId, type: 'render', status: 'processing', progress: 30 });

    // 3. Build filter_complex
    const canvasWidth = Number(timelineSnapshot.canvasWidth ?? 1920);
    const canvasHeight = Number(timelineSnapshot.canvasHeight ?? 1080);
    const durationSec = Number(timelineSnapshot.durationSec ?? 60);

    const filterResult = buildFiltergraph({ clips, canvasWidth, canvasHeight, fps, durationSec });

    // 4. Render
    const outputPath = path.join(tmpDir, `output.${format}`);
    await renderTimeline({
      filterResult,
      outputPath,
      fps,
      format,
      resolution,
      durationSec,
      onProgress: async ({ percent }) => {
        const pct = 30 + Math.round(percent * 0.55);
        await publishProgress({ jobId, type: 'render', status: 'processing', progress: pct });
        await renderJobs().updateOne({ jobId }, { $set: { progress: pct, updatedAt: new Date() } });
      },
    });

    await publishProgress({ jobId, type: 'render', status: 'processing', progress: 90 });

    // 5. Upload to R2
    const { readFile } = await import('node:fs/promises');
    const outputBuffer = await readFile(outputPath);
    const r2Key = renderOutputKey(ownerId, jobId, format);
    await putObject(r2Key, outputBuffer, format === 'mp4' ? 'video/mp4' : 'video/webm');
    const url = await publicUrl(r2Key);

    // 6. Finalize
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
