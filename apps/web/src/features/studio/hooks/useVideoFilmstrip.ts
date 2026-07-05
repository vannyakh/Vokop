import { useEffect, useRef, useState } from 'react';
import { FILMSTRIP_THUMB_WIDTH } from '@vokop/shared';
import { extractFilmstripThumbnails } from '@/features/studio/lib/ffmpeg';
import { captureFilmstripFromVideo } from '@/features/studio/lib/filmstripCapture';
import { extractFilmstripWithOmnitool } from '@/features/studio/lib/omniTool';
import { useVideoToolsHealth } from '@/features/studio/hooks/useVideoToolsHealth';
import { api } from '@/lib/api';

function revokeThumbnailUrls(urls: string[]) {
  urls.forEach((url) => {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  });
}

export function useVideoFilmstrip(
  videoFile: File | null,
  mediaDuration: number,
  videoSessionId: string | null,
) {
  const { ffmpegOk, ffmpegError, isReady } = useVideoToolsHealth();
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const runIdRef = useRef(0);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!isReady) return;

    if (!videoFile || !mediaDuration || !Number.isFinite(mediaDuration)) {
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

      if (ffmpegOk) {
        if (!controller.signal.aborted && videoSessionId) {
          try {
            const { jobId } = await api.startFilmstripJob(videoSessionId, mediaDuration);
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
            const result = await api.filmstripSession(videoSessionId, mediaDuration);
            frames = result.thumbnails;
          } catch (err) {
            console.warn('[filmstrip] sync session failed, trying legacy upload:', err);
          }
        }

        if (!frames.length && !controller.signal.aborted) {
          try {
            const result = await api.filmstrip(videoFile, mediaDuration);
            frames = result.thumbnails;
          } catch (err) {
            console.warn('[filmstrip] server upload failed, trying canvas capture:', err);
          }
        }
      } else if (ffmpegError) {
        console.warn('[filmstrip] server ffmpeg unavailable, using client capture:', ffmpegError);
      }

      if (!frames.length && !controller.signal.aborted) {
        try {
          frames = await captureFilmstripFromVideo(videoFile, mediaDuration, controller.signal);
        } catch (err) {
          console.warn('[filmstrip] canvas capture failed, trying omnitool:', err);
        }
      }

      if (!frames.length && !controller.signal.aborted) {
        try {
          frames = await extractFilmstripWithOmnitool(videoFile, mediaDuration, controller.signal);
        } catch (err) {
          console.warn('[filmstrip] omnitool failed, trying client ffmpeg:', err);
        }
      }

      if (!frames.length && !controller.signal.aborted) {
        try {
          frames = await extractFilmstripThumbnails(videoFile, mediaDuration, controller.signal);
        } catch (err) {
          console.warn('[filmstrip] client ffmpeg failed:', err);
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
  }, [videoFile, mediaDuration, videoSessionId, ffmpegOk, ffmpegError, isReady]);

  return { thumbnails, loading, progress, thumbWidth: FILMSTRIP_THUMB_WIDTH };
}
