/**
 * Local timeline export — renders the project to a video file on disk.
 * Mirrors services/video-tools/src/workers/pipeline/segments.ts but runs
 * entirely in the Electron main process (no server required).
 */

import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { exportPath, extFromFilename } from '../media-store/paths.js';

export type ExportFormat = 'mp4' | 'webm';
export type ExportResolution = '1080p' | '720p' | '480p' | 'original';

const RESOLUTION_MAP: Record<ExportResolution, string> = {
  '1080p': '1920:1080',
  '720p': '1280:720',
  '480p': '854:480',
  original: '-2:-2',
};

export interface ExportClip {
  localPath: string;
  kind: 'video' | 'audio' | 'image';
  startAtSec: number;
  inPointSec: number;
  durationSec: number;
  ffmpegFilter?: string;
  volume?: number;
}

export interface ExportOptions {
  projectId: string;
  jobId: string;
  clips: ExportClip[];
  canvasWidth: number;
  canvasHeight: number;
  durationSec: number;
  fps: number;
  format: ExportFormat;
  resolution: ExportResolution;
  onProgress?: (percent: number) => void;
}

/** Run ffmpeg with optional progress parsing (-progress pipe:2). */
function runFfmpeg(args: string[], durationSec?: number, onProgress?: (pct: number) => void): Promise<void> {
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
          if (m) onProgress(Math.min(99, Math.round(Number(m[1]) / 1_000_000 / durationSec * 100)));
        }
      }
    });
    proc.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') reject(new Error('ffmpeg not found.'));
      else reject(err);
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `ffmpeg exited ${code}`));
    });
  });
}

export async function exportTimeline(opts: ExportOptions): Promise<string> {
  const { projectId, jobId, clips, canvasWidth, canvasHeight, durationSec, fps, format, resolution, onProgress } = opts;

  const outPath = exportPath(projectId, jobId, format);
  mkdirSync(path.dirname(outPath), { recursive: true });

  const scaleStr = RESOLUTION_MAP[resolution];
  const inputs: string[] = [];
  const filters: string[] = [];

  filters.push(`color=c=black:s=${canvasWidth}x${canvasHeight}:r=${fps}:d=${durationSec}[base]`);

  const videoClips = clips.filter((c) => c.kind === 'video' || c.kind === 'image');
  const audioClips = clips.filter((c) => c.kind === 'video' || c.kind === 'audio');
  let prevLabel = 'base';

  for (let i = 0; i < videoClips.length; i++) {
    const clip = videoClips[i];
    inputs.push(clip.localPath);
    const idx = i;
    const trim = `v${i}t`;
    const sc = `v${i}sc`;
    const ov = `v${i}ov`;
    filters.push(
      `[${idx}:v]trim=start=${clip.inPointSec}:duration=${clip.durationSec},` +
      `setpts=PTS-STARTPTS+${clip.startAtSec}/TB` +
      (clip.ffmpegFilter ? `,${clip.ffmpegFilter}` : '') +
      `[${trim}]`,
    );
    filters.push(`[${trim}]scale=${canvasWidth}:${canvasHeight}:force_original_aspect_ratio=decrease,pad=${canvasWidth}:${canvasHeight}:(ow-iw)/2:(oh-ih)/2[${sc}]`);
    filters.push(`[${prevLabel}][${sc}]overlay=shortest=0[${ov}]`);
    prevLabel = ov;
  }

  const vmap = `[${prevLabel}]`;
  let amap: string | null = null;

  if (audioClips.length > 0) {
    const aLabels: string[] = [];
    for (let i = 0; i < audioClips.length; i++) {
      const clip = audioClips[i];
      const vi = videoClips.findIndex((c) => c.localPath === clip.localPath);
      const idx = vi >= 0 ? vi : inputs.length + i;
      if (vi < 0) inputs.push(clip.localPath);
      const al = `a${i}`;
      filters.push(`[${idx}:a]atrim=start=${clip.inPointSec}:duration=${clip.durationSec},asetpts=PTS-STARTPTS,adelay=${Math.round(clip.startAtSec * 1000)}:all=1,volume=${clip.volume ?? 1}[${al}]`);
      aLabels.push(`[${al}]`);
    }
    filters.push(`${aLabels.join('')}amix=inputs=${aLabels.length}:duration=longest[amix_out]`);
    amap = '[amix_out]';
  }

  const codec = format === 'mp4'
    ? { v: 'libx264', a: 'aac', vOpts: ['-preset', 'fast', '-crf', '23'] }
    : { v: 'libvpx-vp9', a: 'libopus', vOpts: ['-b:v', '2M', '-crf', '30'] };

  const args = [
    '-hide_banner', '-loglevel', 'error', '-y',
    ...inputs.flatMap((i) => ['-i', i]),
    '-filter_complex', filters.join(';'),
    '-map', vmap,
    '-vf', `scale=${scaleStr}:force_original_aspect_ratio=decrease`,
    '-r', String(fps),
    '-c:v', codec.v, ...codec.vOpts,
    ...(amap ? ['-map', amap, '-c:a', codec.a, '-b:a', '128k'] : ['-an']),
    outPath,
  ];

  await runFfmpeg(args, durationSec, onProgress);
  onProgress?.(100);
  return outPath;
}
