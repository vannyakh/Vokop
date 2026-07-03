/**
 * FFmpeg spawn wrapper with progress parsing.
 * Moved from src/ffmpeg.ts and extended with duration-based progress.
 */

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
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
  /** Total duration in seconds — used to compute percent from `out_time_ms`. */
  durationSec?: number;
  onProgress?: FfmpegProgressCallback;
}

/** Spawn ffmpeg and optionally parse -progress pipe output. */
export async function runFfmpeg(opts: RunFfmpegOptions | string[]): Promise<void> {
  // Backward-compat: accept plain string[] from existing callers
  const { args, durationSec, onProgress } = Array.isArray(opts)
    ? { args: opts, durationSec: undefined, onProgress: undefined }
    : opts;

  const hasProgress = Boolean(onProgress && durationSec);
  const finalArgs = hasProgress
    ? ['-progress', 'pipe:2', '-nostats', ...args]
    : args;

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('ffmpeg', finalArgs, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';

    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;

      if (hasProgress && onProgress) {
        // -progress writes key=value lines to stderr/pipe
        const lines = text.split('\n');
        for (const line of lines) {
          const match = line.match(/^out_time_ms=(\d+)/);
          if (match && durationSec) {
            const timeSec = Number(match[1]) / 1_000_000;
            const percent = Math.min(99, Math.round((timeSec / durationSec) * 100));
            void onProgress({ percent, time: timeSec });
          }
        }
      }
    });

    proc.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error('ffmpeg is not installed. Install ffmpeg to use server-side video tools.'));
      } else {
        reject(err);
      }
    });

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `ffmpeg exited with code ${code}`));
    });
  });
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
      '-hide_banner', '-loglevel', 'error',
      '-threads', '0', '-y',
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
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', inputPath,
      '-filter_complex', `aformat=channel_layouts=mono,compand,showwavespic=s=${widthPx}x${heightPx}:colors=#6c63ff`,
      '-frames:v', '1',
      outPath,
    ]);
    const data = await readFile(outPath);
    return `data:image/png;base64,${data.toString('base64')}`;
  });
}
