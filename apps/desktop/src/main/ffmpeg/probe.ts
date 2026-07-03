/**
 * Local FFmpeg probe (mirrors services/video-tools/src/workers/pipeline/probe.ts).
 * Runs in the Electron main process.
 */

import { spawn } from 'node:child_process';

export interface ProbeResult {
  duration: number;
  width: number;
  height: number;
  codec: string | null;
  fps: number | null;
  hasAudio: boolean;
  bitrate: number | null;
}

interface FfprobeOutput {
  format?: { duration?: string; bit_rate?: string };
  streams?: Array<{
    codec_type?: string;
    codec_name?: string;
    width?: number;
    height?: number;
    r_frame_rate?: string;
  }>;
}

function runFfprobe(inputPath: string): Promise<FfprobeOutput> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'ffprobe',
      ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', inputPath],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (c: Buffer) => { stdout += c; });
    proc.stderr.on('data', (c: Buffer) => { stderr += c; });
    proc.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error('ffprobe not found. Install ffmpeg.'));
      } else {
        reject(err);
      }
    });
    proc.on('close', (code) => {
      if (code === 0) resolve(JSON.parse(stdout) as FfprobeOutput);
      else reject(new Error(stderr.trim() || `ffprobe exited ${code}`));
    });
  });
}

export async function probeVideo(inputPath: string): Promise<ProbeResult> {
  const out = await runFfprobe(inputPath);
  const duration = parseFloat(out.format?.duration ?? '0') || 0;
  const bitrate = out.format?.bit_rate ? Math.round(Number(out.format.bit_rate) / 1000) : null;
  const vs = out.streams?.find((s) => s.codec_type === 'video');
  const hasAudio = Boolean(out.streams?.some((s) => s.codec_type === 'audio'));

  let fps: number | null = null;
  if (vs?.r_frame_rate) {
    const [n, d] = vs.r_frame_rate.split('/').map(Number);
    if (d) fps = Math.round((n / d) * 100) / 100;
  }

  return {
    duration,
    width: vs?.width ?? 0,
    height: vs?.height ?? 0,
    codec: vs?.codec_name ?? null,
    fps,
    hasAudio,
    bitrate,
  };
}
