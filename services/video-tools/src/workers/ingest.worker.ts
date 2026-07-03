/**
 * Ingest worker — processes uploaded assets:
 *   1. Download from R2 to tmp
 *   2. Probe metadata
 *   3. Generate filmstrip thumbnails (video)
 *   4. Generate waveform (audio / video)
 *   5. Update asset doc in Mongo
 *   6. Publish progress to Redis pub/sub
 */

import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { Worker, type Job } from 'bullmq';
import { getBullConnection } from '../queue/connection.js';
import { QUEUE_NAMES } from '../queue/queues.js';
import { publishProgress } from '../queue/progress.js';
import { getObject } from '../storage/r2.js';
import { assets } from '../db/collections.js';
import { probeVideo } from './pipeline/probe.js';
import { generateFilmstrip, generateWaveform } from './pipeline/ffmpeg.js';
import { withTmpDir } from './pipeline/tmp.js';
import {
  FILMSTRIP_THUMB_HEIGHT,
  FILMSTRIP_THUMB_WIDTH,
  getFilmstripFrameCount,
} from '@vokop/shared';
import { extensionForFilename } from './pipeline/ffmpeg.js';
import type { IngestPayload } from '../queue/payloads.js';

async function processIngest(job: Job<IngestPayload>): Promise<void> {
  const { assetId, r2Key, filename, kind, projectId } = job.data;

  await assets().updateOne({ assetId }, { $set: { status: 'ingesting', updatedAt: new Date() } });
  await publishProgress({ jobId: job.id!, type: 'ingest', status: 'processing', progress: 5 });

  await withTmpDir('vokop-ingest-', async (tmpDir) => {
    // 1. Download from R2
    const fileBuffer = await getObject(r2Key);
    const ext = extensionForFilename(filename);
    const localPath = path.join(tmpDir, `source.${ext}`);
    await writeFile(localPath, fileBuffer);
    await publishProgress({ jobId: job.id!, type: 'ingest', status: 'processing', progress: 20 });

    // 2. Probe
    const probe = await probeVideo(localPath);
    await publishProgress({ jobId: job.id!, type: 'ingest', status: 'processing', progress: 35 });

    // 3. Filmstrip (video only)
    let thumbnails: string[] | undefined;
    if (kind === 'video') {
      const frameCount = getFilmstripFrameCount(probe.duration);
      thumbnails = await generateFilmstrip(
        localPath,
        probe.duration,
        FILMSTRIP_THUMB_WIDTH,
        FILMSTRIP_THUMB_HEIGHT,
        frameCount,
        async ({ done, total }) => {
          const pct = 35 + Math.round((done / total) * 40);
          await publishProgress({ jobId: job.id!, type: 'ingest', status: 'processing', progress: pct, partial: { thumbnailCount: done } });
        },
      );
    }
    await publishProgress({ jobId: job.id!, type: 'ingest', status: 'processing', progress: 80 });

    // 4. Waveform (video + audio)
    let waveformUrl: string | undefined;
    if ((kind === 'video' || kind === 'audio') && probe.hasAudio) {
      try {
        waveformUrl = await generateWaveform(localPath);
      } catch {
        // non-fatal
      }
    }

    // 5. Persist
    await assets().updateOne(
      { assetId },
      {
        $set: {
          status: 'ready',
          probe: {
            duration: probe.duration,
            width: probe.width,
            height: probe.height,
            codec: probe.codec,
            fps: probe.fps,
          },
          thumbnails,
          waveformUrl,
          updatedAt: new Date(),
        },
      },
    );
  });

  await publishProgress({ jobId: job.id!, type: 'ingest', status: 'completed', progress: 100 });
}

export function createIngestWorker() {
  return new Worker<IngestPayload>(
    QUEUE_NAMES.ingest,
    async (job) => {
      try {
        await processIngest(job);
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Ingest failed';
        await assets().updateOne(
          { assetId: job.data.assetId },
          { $set: { status: 'error', error, updatedAt: new Date() } },
        );
        await publishProgress({ jobId: job.id!, type: 'ingest', status: 'failed', progress: 100, error });
        throw err;
      }
    },
    {
      connection: getBullConnection(),
      concurrency: 3,
    },
  );
}
