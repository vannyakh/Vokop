import { useEffect, useRef, useState } from 'react';
import { FILMSTRIP_THUMB_WIDTH } from '@vokop/shared';
import { extractFilmstripThumbnails } from '@/features/studio/lib/ffmpeg';
import { captureFilmstripFromVideo } from '@/features/studio/lib/filmstripCapture';
import { api } from '@/lib/api/client';

function revokeThumbnailUrls(urls: string[]) {
  urls.forEach((url) => {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  });
}

export function useVideoFilmstrip(
  videoFile: File | null,
  duration: number,
  videoSessionId: string | null,
) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const runIdRef = useRef(0);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!videoFile || !duration || !Number.isFinite(duration)) {
      setThumbnails([]);
      setLoading(false);
      setProgress(0);
      return;
    }

    const runId = ++runIdRef.current;
    const controller = new AbortController();
    let cancelled = false;

    const applyFrames = (frames: string[], nextProgress = 100) => {
      if (cancelled || runId !== runIdRef.current) {
        revokeThumbnailUrls(frames);
        return;
      }
      revokeThumbnailUrls(urlsRef.current);
      urlsRef.current = frames;
      setThumbnails(frames);
      setProgress(nextProgress);
    };

    const generate = async () => {
      setLoading(true);
      setProgress(0);
      let frames: string[] = [];

      if (!controller.signal.aborted && videoSessionId) {
        try {
          const { jobId } = await api.startFilmstripJob(videoSessionId, duration);
          const job = await api.waitForVideoJob(jobId, {
            signal: controller.signal,
            onUpdate: (update) => {
              if (update.thumbnails?.length) {
                applyFrames(update.thumbnails, update.progress);
              } else {
                setProgress(update.progress);
              }
            },
          });
          frames = job.thumbnails ?? [];
        } catch (err) {
          if ((err as Error).message !== 'Job cancelled') {
            console.warn('[filmstrip] async session job failed, trying sync session:', err);
          }
        }
      }

      if (!frames.length && !controller.signal.aborted && videoSessionId) {
        try {
          const result = await api.filmstripSession(videoSessionId, duration);
          frames = result.thumbnails;
        } catch (err) {
          console.warn('[filmstrip] sync session failed, trying legacy upload:', err);
        }
      }

      if (!frames.length && !controller.signal.aborted) {
        try {
          const result = await api.filmstrip(videoFile, duration);
          frames = result.thumbnails;
        } catch (err) {
          console.warn('[filmstrip] server upload failed, trying client ffmpeg:', err);
        }
      }

      if (!frames.length && !controller.signal.aborted) {
        try {
          frames = await extractFilmstripThumbnails(videoFile, duration, controller.signal);
        } catch (err) {
          console.warn('[filmstrip] client ffmpeg failed, using canvas fallback:', err);
        }
      }

      if (!frames.length && !controller.signal.aborted) {
        try {
          frames = await captureFilmstripFromVideo(videoFile, duration, controller.signal);
        } catch (err) {
          console.warn('[filmstrip] canvas fallback failed:', err);
        }
      }

      applyFrames(frames);
      if (!cancelled && runId === runIdRef.current) setLoading(false);
    };

    void generate();

    return () => {
      cancelled = true;
      controller.abort();
      revokeThumbnailUrls(urlsRef.current);
      urlsRef.current = [];
    };
  }, [videoFile, duration, videoSessionId]);

  return { thumbnails, loading, progress, thumbWidth: FILMSTRIP_THUMB_WIDTH };
}
