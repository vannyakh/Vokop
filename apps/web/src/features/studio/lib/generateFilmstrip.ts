import { captureFilmstripFromVideo } from '@/features/studio/lib/filmstripCapture';
import { extractFilmstripThumbnails } from '@/features/studio/lib/ffmpeg';
import { extractFilmstripWithOmnitool } from '@/features/studio/lib/omniTool';
import { api } from '@/lib/api';

export interface GenerateFilmstripOptions {
  file: File | null;
  duration: number;
  videoSessionId?: string | null;
  signal?: AbortSignal;
  onProgress?: (progress: number, partial?: string[]) => void;
  ffmpegOk?: boolean;
}

/** Generate timeline filmstrip frames for one video source. */
export async function generateFilmstrip({
  file,
  duration,
  videoSessionId,
  signal,
  onProgress,
  ffmpegOk = true,
}: GenerateFilmstripOptions): Promise<string[]> {
  if (!file || !duration || !Number.isFinite(duration)) return [];
  if (signal?.aborted) return [];

  let frames: string[] = [];

  if (ffmpegOk && videoSessionId) {
    try {
      const { jobId } = await api.startFilmstripJob(videoSessionId, duration);
      const job = await api.waitForVideoJob(jobId, {
        signal,
        onUpdate: (update) => {
          if (update.thumbnails?.length) {
            frames = update.thumbnails;
            onProgress?.(update.progress, update.thumbnails);
          } else {
            onProgress?.(update.progress);
          }
        },
      });
      frames = job.thumbnails ?? frames;
    } catch {
      /* fall through */
    }
  }

  if (!frames.length && !signal?.aborted && ffmpegOk && videoSessionId) {
    try {
      const result = await api.filmstripSession(videoSessionId, duration);
      frames = result.thumbnails;
      onProgress?.(100, frames);
    } catch {
      /* fall through */
    }
  }

  if (!frames.length && !signal?.aborted && ffmpegOk) {
    try {
      const result = await api.filmstrip(file, duration);
      frames = result.thumbnails;
      onProgress?.(100, frames);
    } catch {
      /* fall through */
    }
  }

  if (!frames.length && !signal?.aborted) {
    try {
      frames = await captureFilmstripFromVideo(file, duration, signal);
      onProgress?.(100, frames);
    } catch {
      /* fall through */
    }
  }

  if (!frames.length && !signal?.aborted) {
    try {
      frames = await extractFilmstripWithOmnitool(file, duration, signal);
      onProgress?.(100, frames);
    } catch {
      /* fall through */
    }
  }

  if (!frames.length && !signal?.aborted) {
    try {
      frames = await extractFilmstripThumbnails(file, duration, signal);
      onProgress?.(100, frames);
    } catch {
      /* fall through */
    }
  }

  return frames;
}
