import { spawn } from 'node:child_process';
import type { FfmpegHealth } from '@vokop/api';

const FFMPEG_BIN = process.env.FFMPEG_BIN ?? 'ffmpeg';

let cached: FfmpegHealth | null = null;

function summarizeFfmpegFailure(stderr: string, code: number | null, signal: NodeJS.Signals | null): string {
  const tail = stderr.trim();
  if (tail.includes('Library not loaded') || tail.includes('dyld')) {
    return `${tail.split('\n')[0] ?? 'FFmpeg failed to start'}. Run: brew reinstall ffmpeg`;
  }
  if (tail) return tail.slice(-500);
  if (signal) return `FFmpeg terminated (${signal}). Run: brew reinstall ffmpeg`;
  if (code != null) return `FFmpeg exited with code ${code}`;
  return 'FFmpeg is unavailable. Install or reinstall: brew install ffmpeg';
}

/** Probe whether the configured ffmpeg binary can run. Result is cached for process lifetime. */
export async function getFfmpegHealth(force = false): Promise<FfmpegHealth> {
  if (cached && !force) return cached;

  const result = await new Promise<FfmpegHealth>((resolve) => {
    const child = spawn(FFMPEG_BIN, ['-version'], { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderr = (stderr + chunk).slice(-4000);
    });

    child.on('error', (err) => {
      resolve({ ok: false, error: `failed to spawn ${FFMPEG_BIN}: ${err.message}` });
    });

    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve({ ok: true });
        return;
      }
      resolve({ ok: false, error: summarizeFfmpegFailure(stderr, code, signal) });
    });
  });

  cached = result;
  return result;
}

export function requireFfmpegHealth(health: FfmpegHealth): string | null {
  return health.ok ? null : (health.error ?? 'FFmpeg unavailable');
}
