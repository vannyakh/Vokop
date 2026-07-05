import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { VideoAudioGraph } from '@/features/audio/hooks/useAudioEngine';

const BAR_COUNT = 3;
const SMOOTHING = 0.65;
const IDLE_LEVELS = Array(BAR_COUNT).fill(0);

export function useAudioVisualizer(
  videoRef: RefObject<HTMLVideoElement | null>,
  connectVideoAudioGraph: (video: HTMLVideoElement) => Promise<VideoAudioGraph>,
  isActive: boolean,
): number[] {
  const [levels, setLevels] = useState<number[]>(IDLE_LEVELS);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const smoothedRef = useRef<number[]>(IDLE_LEVELS);

  useEffect(() => {
    if (!isActive) {
      smoothedRef.current = IDLE_LEVELS;
      setLevels(IDLE_LEVELS);
      return;
    }

    let cancelled = false;
    let raf = 0;

    const setup = async () => {
      const video = videoRef.current;
      if (!video) return;

      const { analyser } = await connectVideoAudioGraph(video);
      if (cancelled) return;

      if (!dataRef.current || dataRef.current.length !== analyser.frequencyBinCount) {
        dataRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      }
      const data = dataRef.current;
      const bucketSize = Math.max(1, Math.floor(data.length / BAR_COUNT));

      const tick = () => {
        analyser.getByteFrequencyData(data);

        const next = smoothedRef.current.map((prev, i) => {
          const start = i * bucketSize;
          let sum = 0;
          for (let j = start; j < start + bucketSize; j += 1) sum += data[j] ?? 0;
          const target = sum / bucketSize / 255;
          return prev + (target - prev) * (1 - SMOOTHING);
        });
        smoothedRef.current = next;
        setLevels(next);

        raf = requestAnimationFrame(tick);
      };

      raf = requestAnimationFrame(tick);
    };

    void setup();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs/functions are stable identities.
  }, [isActive]);

  return levels;
}
