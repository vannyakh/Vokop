import { useEffect, useRef, type RefObject } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface UseWaveSurferOptions {
  url?: string | null;
  media?: RefObject<HTMLMediaElement | null>;
  syncMedia?: RefObject<HTMLMediaElement | null>;
  mediaReadyKey?: string | null;
  height?: number;
  waveColor?: string;
  progressColor?: string;
  cursorColor?: string;
  interact?: boolean;
  onSeek?: (time: number) => void;
}

export function useWaveSurfer({
  url,
  media,
  syncMedia,
  mediaReadyKey,
  height = 48,
  waveColor = 'rgba(232, 163, 61, 0.28)',
  progressColor = 'rgba(232, 163, 61, 0.88)',
  cursorColor = 'rgba(255, 255, 255, 0.6)',
  interact = true,
  onSeek,
}: UseWaveSurferOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const onSeekRef = useRef(onSeek);
  onSeekRef.current = onSeek;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mediaEl = media?.current ?? null;
    if (!url && !mediaEl) return;

    let cancelled = false;
    let ws: WaveSurfer | null = null;

    const mount = () => {
      if (cancelled || !containerRef.current) return;

      ws = WaveSurfer.create({
        container: containerRef.current,
        height,
        waveColor,
        progressColor,
        cursorColor,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        normalize: true,
        interact,
        media: mediaEl ?? undefined,
        url: mediaEl ? undefined : (url ?? undefined),
      });

      wsRef.current = ws;

      const onInteraction = (time: number) => onSeekRef.current?.(time);
      ws.on('interaction', onInteraction);

      const syncEl = syncMedia?.current;
      const onTime = () => {
        if (ws && ws.getDuration() > 0) ws.setTime(syncEl!.currentTime);
      };
      if (syncEl && !mediaEl) syncEl.addEventListener('timeupdate', onTime);

      return () => {
        if (syncEl && !mediaEl) syncEl.removeEventListener('timeupdate', onTime);
        ws?.un('interaction', onInteraction);
        ws?.destroy();
        wsRef.current = null;
      };
    };

    let cleanup: (() => void) | undefined;

    if (mediaEl) {
      if (mediaEl.readyState >= 1) cleanup = mount();
      else {
        const onReady = () => {
          cleanup = mount();
        };
        mediaEl.addEventListener('loadedmetadata', onReady, { once: true });
        return () => {
          cancelled = true;
          mediaEl.removeEventListener('loadedmetadata', onReady);
          cleanup?.();
        };
      }
    } else {
      cleanup = mount();
    }

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [url, media, syncMedia, mediaReadyKey, height, waveColor, progressColor, cursorColor, interact]);

  return { containerRef, wavesurfer: wsRef };
}
