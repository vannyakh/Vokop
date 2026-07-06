import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { VideoAudioGraph } from '@/features/audio/hooks/useAudioEngine';

const BAR_COUNT = 5;
const SMOOTHING = 0.65;
const IDLE_LEVELS = Array(BAR_COUNT).fill(0);

/** Normalized peak above this triggers a high-volume warning. */
export const PLAYBACK_HIGH_VOLUME = 0.72;
/** Normalized peak above this indicates clipping / extreme loudness. */
export const PLAYBACK_CLIP_VOLUME = 0.92;

export interface AudioVisualizerReadout {
  levels: number[];
  /** Normalized time-domain peak 0–1. */
  peakLevel: number;
  isHighVolume: boolean;
  isClipping: boolean;
}

const IDLE_READOUT: AudioVisualizerReadout = {
  levels: IDLE_LEVELS,
  peakLevel: 0,
  isHighVolume: false,
  isClipping: false,
};

export function useAudioVisualizer(
  videoRef: RefObject<HTMLVideoElement | null>,
  connectVideoAudioGraph: (video: HTMLVideoElement) => Promise<VideoAudioGraph>,
  isActive: boolean,
): AudioVisualizerReadout {
  const [readout, setReadout] = useState<AudioVisualizerReadout>(IDLE_READOUT);
  const freqRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const timeRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const smoothedRef = useRef<number[]>(IDLE_LEVELS);

  useEffect(() => {
    if (!isActive) {
      smoothedRef.current = IDLE_LEVELS;
      setReadout(IDLE_READOUT);
      return;
    }

    let cancelled = false;
    let raf = 0;

    const setup = async () => {
      const video = videoRef.current;
      if (!video) return;

      const { analyser } = await connectVideoAudioGraph(video);
      if (cancelled) return;

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.55;

      if (!freqRef.current || freqRef.current.length !== analyser.frequencyBinCount) {
        freqRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      }
      if (!timeRef.current || timeRef.current.length !== analyser.fftSize) {
        timeRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      }

      const freqData = freqRef.current;
      const timeData = timeRef.current;
      const bucketSize = Math.max(1, Math.floor(freqData.length / BAR_COUNT));

      const tick = () => {
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);

        let peak = 0;
        for (let i = 0; i < timeData.length; i += 1) {
          const v = Math.abs((timeData[i]! - 128) / 128);
          if (v > peak) peak = v;
        }

        const nextLevels = smoothedRef.current.map((prev, i) => {
          const start = i * bucketSize;
          let sum = 0;
          for (let j = start; j < start + bucketSize; j += 1) sum += freqData[j] ?? 0;
          const target = sum / bucketSize / 255;
          return prev + (target - prev) * (1 - SMOOTHING);
        });
        smoothedRef.current = nextLevels;

        setReadout({
          levels: nextLevels,
          peakLevel: peak,
          isHighVolume: peak >= PLAYBACK_HIGH_VOLUME,
          isClipping: peak >= PLAYBACK_CLIP_VOLUME,
        });

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

  return readout;
}
