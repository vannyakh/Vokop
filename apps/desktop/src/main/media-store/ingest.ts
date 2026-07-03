/**
 * Ingest an external file into the local media store:
 *  1. Copy original to originals/<assetId>.<ext>
 *  2. Run FFmpeg probe
 *  3. Encode proxy (for video/audio)
 *  4. Generate filmstrip thumbnails (video)
 *  5. Generate waveform PNG (video/audio)
 *  6. Update asset record in DB
 */

import { copyFile, stat } from 'node:fs/promises';
import type { DatabaseSync } from 'node:sqlite';
import type { BrowserWindow } from 'electron';
import { originalPath, proxyPath, thumbsDir, waveformPath, extFromFilename } from './paths.js';
import { probeVideo } from '../ffmpeg/probe.js';
import { encodeProxy, generateFilmstrip, generateWaveform } from '../ffmpeg/ingest.js';
import { createAsset, updateAsset, type LocalAsset } from '../local-db/assets.js';

export interface IngestResult {
  asset: LocalAsset;
}

export async function ingestFile(
  db: DatabaseSync,
  input: {
    projectId: string;
    filePath: string;
    filename: string;
    kind: 'video' | 'audio' | 'image';
  },
  onProgress?: (percent: number, stage: string) => void,
): Promise<IngestResult> {
  const { stat: statFn } = await import('node:fs/promises');
  const { size } = await statFn(input.filePath);

  // 1. Create asset record
  let asset = createAsset(db, {
    projectId: input.projectId,
    filename: input.filename,
    kind: input.kind,
    originalPath: input.filePath, // will be updated below
    size,
  });

  try {
    asset = updateAsset(db, asset.id, { status: 'ingesting' })!;
    onProgress?.(5, 'Copying original');

    // 2. Copy to originals dir
    const ext = extFromFilename(input.filename);
    const destPath = originalPath(asset.id, ext);
    await copyFile(input.filePath, destPath);
    asset = updateAsset(db, asset.id, { originalPath: destPath })!;
    onProgress?.(15, 'Probing metadata');

    // 3. Probe
    const probe = await probeVideo(destPath);
    asset = updateAsset(db, asset.id, {
      durationSec: probe.duration,
      width: probe.width ?? null,
      height: probe.height ?? null,
      fps: probe.fps ?? null,
      codec: probe.codec ?? null,
    })!;
    onProgress?.(25, 'Encoding proxy');

    // 4. Proxy (video/audio)
    let pPath: string | null = null;
    if (input.kind === 'video' || input.kind === 'audio') {
      pPath = proxyPath(asset.id);
      await encodeProxy(destPath, pPath, input.kind, (p) => {
        onProgress?.(25 + Math.round(p * 0.35), 'Encoding proxy');
      });
      asset = updateAsset(db, asset.id, { proxyPath: pPath })!;
    }
    onProgress?.(60, 'Generating thumbnails');

    // 5. Filmstrip (video)
    let tDir: string | null = null;
    if (input.kind === 'video') {
      tDir = thumbsDir(asset.id);
      await generateFilmstrip(destPath, tDir, probe.duration ?? 10, (p) => {
        onProgress?.(60 + Math.round(p * 0.25), 'Generating thumbnails');
      });
      asset = updateAsset(db, asset.id, { thumbDir: tDir })!;
    }
    onProgress?.(88, 'Generating waveform');

    // 6. Waveform (video/audio)
    let wPath: string | null = null;
    if ((input.kind === 'video' || input.kind === 'audio') && probe.duration) {
      wPath = waveformPath(asset.id);
      await generateWaveform(pPath ?? destPath, wPath).catch(() => undefined);
      if (wPath) asset = updateAsset(db, asset.id, { waveformPath: wPath })!;
    }

    asset = updateAsset(db, asset.id, { status: 'ready' })!;
    onProgress?.(100, 'Done');
    return { asset };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Ingest failed';
    asset = updateAsset(db, asset.id, { status: 'error', error })!;
    throw err;
  }
}
