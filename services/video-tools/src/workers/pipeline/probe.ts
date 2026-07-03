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

async function runFfprobe(inputPath: string): Promise<FfprobeOutput> {
  const output = await new Promise<string>((resolve, reject) => {
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
        reject(new Error('ffprobe is not installed. Install ffmpeg to use server-side video tools.'));
      } else {
        reject(err);
      }
    });
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.trim() || `ffprobe exited with code ${code}`));
    });
  });

  return JSON.parse(output) as FfprobeOutput;
}

export async function probeVideo(inputPath: string): Promise<ProbeResult> {
  const output = await runFfprobe(inputPath);
  const duration = parseFloat(output.format?.duration ?? '0') || 0;
  const bitrate = output.format?.bit_rate ? Math.round(Number(output.format.bit_rate) / 1000) : null;

  const videoStream = output.streams?.find((s) => s.codec_type === 'video');
  const hasAudio = Boolean(output.streams?.some((s) => s.codec_type === 'audio'));

  let fps: number | null = null;
  if (videoStream?.r_frame_rate) {
    const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
    if (den) fps = Math.round((num / den) * 100) / 100;
  }

  return {
    duration,
    width: videoStream?.width ?? 0,
    height: videoStream?.height ?? 0,
    codec: videoStream?.codec_name ?? null,
    fps,
    hasAudio,
    bitrate,
  };
}
