/**
 * Local FFmpeg ingest helpers:
 *  - encodeProxy: re-encode to a lower-res proxy for smooth editing
 *  - generateFilmstrip: extract thumbnails
 *  - generateWaveform: render waveform PNG
 */

import { spawn } from 'node:child_process';
import path from 'node:path';

type ProgressCallback = (percent: number) => void;

function runFfmpeg(args: string[], durationSec?: number, onProgress?: ProgressCallback): Promise<void> {
  const finalArgs = onProgress && durationSec
    ? ['-progress', 'pipe:2', '-nostats', ...args]
    : args;

  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', finalArgs, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';

    proc.stderr.on('data', (c: Buffer) => {
      const text = c.toString();
      stderr += text;
      if (onProgress && durationSec) {
        for (const line of text.split('\n')) {
          const m = line.match(/^out_time_ms=(\d+)/);
          if (m) {
            const pct = Math.min(99, Math.round(Number(m[1]) / 1_000_000 / durationSec * 100));
            onProgress(pct);
          }
        }
      }
    });

    proc.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') reject(new Error('ffmpeg not found. Install ffmpeg.'));
      else reject(err);
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `ffmpeg exited ${code}`));
    });
  });
}

/** Re-encode to a low-bitrate proxy MP4 for smooth editing playback. */
export async function encodeProxy(
  inputPath: string,
  outputPath: string,
  kind: 'video' | 'audio',
  onProgress?: ProgressCallback,
): Promise<void> {
  if (kind === 'audio') {
    await runFfmpeg([
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', inputPath,
      '-c:a', 'aac', '-b:a', '128k',
      outputPath,
    ]);
    return;
  }

  await runFfmpeg(
    [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', inputPath,
      '-vf', 'scale=1280:-2:force_original_aspect_ratio=decrease',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
      '-c:a', 'aac', '-b:a', '96k',
      '-movflags', '+faststart',
      outputPath,
    ],
    undefined, // durationSec passed via callback below
    onProgress,
  );
}

/** Extract filmstrip thumbnails from a video. Saves frame_001.jpg … */
export async function generateFilmstrip(
  inputPath: string,
  outputDir: string,
  durationSec: number,
  onProgress?: ProgressCallback,
): Promise<string[]> {
  const frameCount = Math.min(60, Math.max(8, Math.round(durationSec / 2)));
  const fps = Math.max(0.05, frameCount / Math.max(durationSec, 0.1));
  const pattern = path.join(outputDir, 'frame_%03d.jpg');

  await runFfmpeg(
    [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', inputPath,
      '-an', '-sn',
      '-vf', `scale=160:90:force_original_aspect_ratio=decrease,pad=160:90:(ow-iw)/2:(oh-ih)/2:black,fps=${fps}`,
      '-frames:v', String(frameCount),
      '-q:v', '8',
      pattern,
    ],
    durationSec,
    onProgress,
  );

  const frames: string[] = [];
  for (let i = 1; i <= frameCount; i++) {
    frames.push(path.join(outputDir, `frame_${String(i).padStart(3, '0')}.jpg`));
  }
  return frames;
}

/** Render a waveform image. */
export async function generateWaveform(inputPath: string, outputPath: string): Promise<void> {
  await runFfmpeg([
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', inputPath,
    '-filter_complex', 'aformat=channel_layouts=mono,compand,showwavespic=s=800x80:colors=#6c63ff',
    '-frames:v', '1',
    outputPath,
  ]);
}
