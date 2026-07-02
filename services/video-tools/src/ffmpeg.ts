import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export async function runFfmpeg(args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error('ffmpeg is not installed. Install ffmpeg to use server-side video tools.'));
        return;
      }
      reject(err);
    });

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `ffmpeg exited with code ${code}`));
    });
  });
}

export async function probeVideo(inputPath: string) {
  const output = await runFfprobe(inputPath);
  const duration = parseFloat(output.format?.duration ?? '0') || 0;
  const videoStream = output.streams?.find((s) => s.codec_type === 'video');

  let fps: number | null = null;
  if (videoStream?.r_frame_rate) {
    const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
    if (den) fps = num / den;
  }

  return {
    duration,
    width: videoStream?.width ?? 0,
    height: videoStream?.height ?? 0,
    codec: videoStream?.codec_name ?? null,
    fps,
  };
}

async function runFfprobe(inputPath: string): Promise<FfprobeOutput> {
  const output = await new Promise<string>((resolve, reject) => {
    const proc = spawn(
      'ffprobe',
      [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        inputPath,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error('ffprobe is not installed. Install ffmpeg to use server-side video tools.'));
        return;
      }
      reject(err);
    });

    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.trim() || `ffprobe exited with code ${code}`));
    });
  });

  return JSON.parse(output) as FfprobeOutput;
}

interface FfprobeOutput {
  format?: { duration?: string };
  streams?: Array<{
    codec_type?: string;
    codec_name?: string;
    width?: number;
    height?: number;
    r_frame_rate?: string;
  }>;
}

export interface FilmstripProgress {
  done: number;
  total: number;
  thumbnail: string;
}

/** Fast single-pass filmstrip with optional progressive callbacks. */
export async function generateFilmstrip(
  inputPath: string,
  duration: number,
  width: number,
  height: number,
  frameCount: number,
  onProgress?: (update: FilmstripProgress) => void | Promise<void>,
): Promise<string[]> {
  const workDir = await mkdtemp(path.join(tmpdir(), 'vokop-filmstrip-'));
  const scaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`;

  try {
    const fps = Math.max(0.05, frameCount / Math.max(duration, 0.1));
    const pattern = path.join(workDir, 'thumb_%03d.jpg');

    await runFfmpeg([
      '-hide_banner',
      '-loglevel',
      'error',
      '-threads',
      '0',
      '-y',
      '-i',
      inputPath,
      '-an',
      '-sn',
      '-vf',
      `${scaleFilter},fps=${fps}`,
      '-frames:v',
      String(frameCount),
      '-q:v',
      '8',
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
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export function extensionForFilename(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext && ext.length <= 5) return ext;
  return 'mp4';
}
