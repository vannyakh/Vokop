import {
  FILMSTRIP_THUMB_HEIGHT,
  FILMSTRIP_THUMB_WIDTH,
  getFilmstripFrameCount,
} from '@vokop/shared';

/**
 * Client-side filmstrip via Omnitool (mediabunny / WebCodecs).
 * Prefer this over ffmpeg.wasm when the server filmstrip is unavailable.
 */
export async function extractFilmstripWithOmnitool(
  file: File,
  duration: number,
  signal?: AbortSignal,
): Promise<string[]> {
  if (!file || !duration || !Number.isFinite(duration) || duration <= 0) return [];

  const { Filmstrip } = await import('@omnimedia/omnitool');

  const frameCount = getFilmstripFrameCount(duration);
  const frequency = Math.max(0.25, duration / Math.max(1, frameCount - 1));

  return new Promise<string[]>((resolve, reject) => {
    let settled = false;

    const finish = (urls: string[]) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      resolve(urls);
    };

    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    const onAbort = () => fail(new DOMException('Aborted', 'AbortError'));
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });

    const timeout = window.setTimeout(() => finish([]), 20_000);

    void Filmstrip.init(file, {
      frequency,
      canvasSinkOptions: {
        width: FILMSTRIP_THUMB_WIDTH,
        height: FILMSTRIP_THUMB_HEIGHT,
        fit: 'fill',
      },
      onChange(tiles) {
        if (settled) return;
        const sorted = [...tiles].sort((a, b) => a.time - b.time);
        if (sorted.length === 0) return;

        try {
          const urls = sorted.map(({ canvas }) => {
            const el = canvas.canvas as HTMLCanvasElement;
            return el.toDataURL('image/jpeg', 0.72);
          });
          window.clearTimeout(timeout);
          finish(urls);
        } catch (err) {
          window.clearTimeout(timeout);
          fail(err);
        }
      },
    })
      .then((filmstrip) => {
        filmstrip.range = [0, duration];
      })
      .catch((err) => {
        window.clearTimeout(timeout);
        fail(err);
      });
  });
}
