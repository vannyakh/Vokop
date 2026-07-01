import { useEffect, useRef, useState } from 'react';
import { extractFilmstripThumbnails, FILMSTRIP_THUMB_WIDTH } from '@/features/studio/lib/ffmpeg';
import { captureFilmstripFromVideo } from '@/features/studio/lib/filmstripCapture';

function revokeThumbnailUrls(urls: string[]) {
  urls.forEach((url) => {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  });
}

export function useVideoFilmstrip(videoFile: File | null, duration: number) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const runIdRef = useRef(0);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!videoFile || !duration || !Number.isFinite(duration)) {
      setThumbnails([]);
      setLoading(false);
      return;
    }

    const runId = ++runIdRef.current;
    const controller = new AbortController();
    let cancelled = false;

    const applyFrames = (frames: string[]) => {
      if (cancelled || runId !== runIdRef.current) {
        revokeThumbnailUrls(frames);
        return;
      }
      revokeThumbnailUrls(urlsRef.current);
      urlsRef.current = frames;
      setThumbnails(frames);
    };

    const generate = async () => {
      setLoading(true);
      let frames: string[] = [];

      try {
        frames = await extractFilmstripThumbnails(videoFile, duration, controller.signal);
      } catch (err) {
        console.warn('[filmstrip] ffmpeg extraction failed, using canvas fallback:', err);
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
  }, [videoFile, duration]);

  return { thumbnails, loading, thumbWidth: FILMSTRIP_THUMB_WIDTH };
}
