import {
  FILMSTRIP_THUMB_HEIGHT,
  FILMSTRIP_THUMB_WIDTH,
  getFilmstripFrameCount,
} from '@/features/studio/lib/filmstripConstants';

function waitForMetadata(video: HTMLVideoElement, signal?: AbortSignal): Promise<void> {
  if (video.readyState >= 1) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Failed to load video for filmstrip capture'));
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
      signal?.removeEventListener('abort', onAbort);
    };

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('error', onError);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function seekVideo(video: HTMLVideoElement, time: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));

  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Seek failed during filmstrip capture'));
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      signal?.removeEventListener('abort', onAbort);
    };

    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    signal?.addEventListener('abort', onAbort, { once: true });
    video.currentTime = time;
  });
}

/** Canvas-seek fallback using a detached video element (does not touch playback). */
export async function captureFilmstripFromVideo(
  file: File,
  duration: number,
  signal?: AbortSignal,
): Promise<string[]> {
  if (signal?.aborted) return [];

  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = url;

  try {
    await waitForMetadata(video, signal);

    const videoDuration = Number.isFinite(video.duration) ? video.duration : duration;
    const count = getFilmstripFrameCount(videoDuration);

    const canvas = document.createElement('canvas');
    canvas.width = FILMSTRIP_THUMB_WIDTH;
    canvas.height = FILMSTRIP_THUMB_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    const frames: string[] = [];

    for (let i = 0; i < count; i++) {
      if (signal?.aborted) break;

      const target = count === 1 ? 0 : (videoDuration * i) / (count - 1);
      await seekVideo(video, target, signal);

      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, FILMSTRIP_THUMB_WIDTH, FILMSTRIP_THUMB_HEIGHT);

      if (video.videoWidth > 0) {
        const scale = Math.min(
          FILMSTRIP_THUMB_WIDTH / video.videoWidth,
          FILMSTRIP_THUMB_HEIGHT / video.videoHeight,
        );
        const w = video.videoWidth * scale;
        const h = video.videoHeight * scale;
        ctx.drawImage(
          video,
          (FILMSTRIP_THUMB_WIDTH - w) / 2,
          (FILMSTRIP_THUMB_HEIGHT - h) / 2,
          w,
          h,
        );
      }

      frames.push(canvas.toDataURL('image/jpeg', 0.55));
    }

    return frames;
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}
