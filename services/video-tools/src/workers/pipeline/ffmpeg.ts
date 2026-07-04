/**
 * video-tools FFmpeg helpers on top of `@vokop/pipeline`.
 * Filmstrip / waveform PNG stay here (API returns base64 data URLs).
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { runFFmpeg } from '@vokop/pipeline';
import { withTmpDir } from './tmp.js';

export interface FfmpegProgressEvent {
  /** Progress as 0–100 */
  percent: number;
  /** Current output time in seconds */
  time: number;
}

export type FfmpegProgressCallback = (event: FfmpegProgressEvent) => void | Promise<void>;

interface RunFfmpegOptions {
  args: string[];
  durationSec?: number;
  onProgress?: FfmpegProgressCallback;
}

/** Spawn ffmpeg via `@vokop/pipeline` (progress is 0–100 for callers). */
export async function runFfmpeg(opts: RunFfmpegOptions | string[]): Promise<void> {
  const { args, durationSec, onProgress } = Array.isArray(opts)
    ? { args: opts, durationSec: undefined, onProgress: undefined }
    : opts;

  // Strip flags the package injects so callers can keep legacy argv lists.
  const cleaned = stripInjectedFlags(args);

  await runFFmpeg({
    args: cleaned,
    totalDurationSec: durationSec,
    onProgress: onProgress
      ? (p) => {
          void onProgress({
            percent: p.percent >= 0 ? Math.min(99, Math.round(p.percent * 100)) : 0,
            time: p.outTimeSec,
          });
        }
      : undefined,
  });
}

function stripInjectedFlags(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-hide_banner' || a === '-nostats' || a === '-y') continue;
    if (a === '-progress') {
      i += 1;
      continue;
    }
    out.push(a!);
  }
  return out;
}

export function extensionForFilename(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext && ext.length <= 5) return ext;
  return 'mp4';
}

// ─── Filmstrip ────────────────────────────────────────────────────────────────

export interface FilmstripProgress {
  done: number;
  total: number;
  thumbnail: string;
}

export async function generateFilmstrip(
  inputPath: string,
  duration: number,
  width: number,
  height: number,
  frameCount: number,
  onProgress?: (update: FilmstripProgress) => void | Promise<void>,
): Promise<string[]> {
  return withTmpDir('vokop-filmstrip-', async (workDir) => {
    const scaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`;
    const fps = Math.max(0.05, frameCount / Math.max(duration, 0.1));
    const pattern = path.join(workDir, 'thumb_%03d.jpg');

    await runFfmpeg([
      '-loglevel', 'error',
      '-threads', '0',
      '-i', inputPath,
      '-an', '-sn',
      '-vf', `${scaleFilter},fps=${fps}`,
      '-frames:v', String(frameCount),
      '-q:v', '8',
      pattern,
    ]);

    const thumbnails: string[] = [];
    for (let i = 1; i <= frameCount; i++) {
      const filePath = path.join(workDir, `thumb_${String(i).padStart(3, '0')}.jpg`);
      try {
        const data = await readFile(filePath);
        const thumbnail = `data:image/jpeg;base64,${data.toString('base64')}`;
        thumbnails.push(thumbnail);
        await onProgress?.({ done: i, total: frameCount, thumbnail });
      } catch {
        break;
      }
    }

    return thumbnails;
  });
}

// ─── Waveform ─────────────────────────────────────────────────────────────────

/** Extract a waveform PNG from an audio/video file. Returns base64 data URL. */
export async function generateWaveform(
  inputPath: string,
  widthPx = 800,
  heightPx = 80,
): Promise<string> {
  return withTmpDir('vokop-waveform-', async (workDir) => {
    const outPath = path.join(workDir, 'waveform.png');
    await runFfmpeg([
      '-loglevel', 'error',
      '-i', inputPath,
      '-filter_complex', `aformat=channel_layouts=mono,compand,showwavespic=s=${widthPx}x${heightPx}:colors=#6c63ff`,
      '-frames:v', '1',
      outPath,
    ]);
    const data = await readFile(outPath);
    return `data:image/png;base64,${data.toString('base64')}`;
  });
}
