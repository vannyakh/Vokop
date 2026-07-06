import { useEffect, useRef, useState, type RefObject } from 'react';
import type { VideoAudioGraph } from '@/features/audio/hooks/useAudioEngine';
import {
  PLAYBACK_CLIP_VOLUME,
  PLAYBACK_HIGH_VOLUME,
  type AudioVisualizerReadout,
} from '@/features/audio/hooks/useAudioVisualizer';

const BAR_COUNT = 5;
const SMOOTHING = 0.38;
const IDLE_LEVELS = Array(BAR_COUNT).fill(0);

const IDLE_READOUT: AudioVisualizerReadout = {
  levels: IDLE_LEVELS,
  peakLevel: 0,
  isHighVolume: false,
  isClipping: false,
};

function readTimeDomainLevels(
  analyser: AnalyserNode,
  timeData: Uint8Array,
  barCount: number,
): { levels: number[]; peak: number } {
  analyser.getByteTimeDomainData(timeData);

  let peak = 0;
  const segment = Math.max(1, Math.floor(timeData.length / barCount));
  const levels: number[] = [];

  for (let i = 0; i < barCount; i += 1) {
    const start = i * segment;
    const end = i === barCount - 1 ? timeData.length : start + segment;
    let sumSq = 0;
    for (let j = start; j < end; j += 1) {
      const v = Math.abs((timeData[j]! - 128) / 128);
      if (v > peak) peak = v;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / Math.max(1, end - start));
    levels.push(Math.min(1, Math.pow(rms * 1.75, 0.78)));
  }

  return { levels, peak };
}

function mergeLevels(a: number[], b: number[]): number[] {
  return a.map((v, i) => Math.max(v, b[i] ?? 0));
}

/**
 * Live playback monitor for the timeline transport bar.
 * Merges the preview video bus + hidden timeline audio track element so
 * voice/sound clips are reflected in the meter during production playback.
 */
export function useTimelinePlaybackMonitor(
  videoRef: RefObject<HTMLVideoElement | null>,
  timelineAudioRef: RefObject<HTMLMediaElement | null>,
  connectVideoAudioGraph: (video: HTMLVideoElement) => Promise<VideoAudioGraph>,
  connectTimelineAudioGraph: (media: HTMLMediaElement) => Promise<AnalyserNode | null>,
  isActive: boolean,
): AudioVisualizerReadout {
  const [readout, setReadout] = useState<AudioVisualizerReadout>(IDLE_READOUT);
  const videoTimeRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const trackTimeRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const smoothedRef = useRef<number[]>(IDLE_LEVELS);

  useEffect(() => {
    if (!isActive) {
      smoothedRef.current = IDLE_LEVELS;
      setReadout(IDLE_READOUT);
      return;
    }

    let cancelled = false;
    let raf = 0;
    let videoAnalyser: AnalyserNode | null = null;
    let trackAnalyser: AnalyserNode | null = null;
    let trackConnectPending = false;

    const ensureTrackAnalyser = async () => {
      if (trackAnalyser || trackConnectPending) return trackAnalyser;
      const el = timelineAudioRef.current;
      if (!el) return null;
      trackConnectPending = true;
      try {
        trackAnalyser = await connectTimelineAudioGraph(el);
      } finally {
        trackConnectPending = false;
      }
      return trackAnalyser;
    };

    const setup = async () => {
      const video = videoRef.current;
      if (!video) return;

      const graph = await connectVideoAudioGraph(video);
      if (cancelled) return;
      videoAnalyser = graph.analyser;
      videoAnalyser.fftSize = 256;
      videoAnalyser.smoothingTimeConstant = 0.35;

      const trackEl = timelineAudioRef.current;
      if (trackEl) {
        trackAnalyser = await connectTimelineAudioGraph(trackEl);
      }

      if (graph.ctx.state === 'suspended') {
        await graph.ctx.resume().catch(() => undefined);
      }

      const bufLen = videoAnalyser.fftSize;
      if (!videoTimeRef.current || videoTimeRef.current.length !== bufLen) {
        videoTimeRef.current = new Uint8Array(new ArrayBuffer(bufLen));
      }
      if (!trackTimeRef.current || trackTimeRef.current.length !== bufLen) {
        trackTimeRef.current = new Uint8Array(new ArrayBuffer(bufLen));
      }

      const tick = () => {
        if (!videoAnalyser) return;

        if (!trackAnalyser && timelineAudioRef.current) {
          void ensureTrackAnalyser();
        }

        const videoSample = readTimeDomainLevels(
          videoAnalyser,
          videoTimeRef.current!,
          BAR_COUNT,
        );

        let mergedLevels = videoSample.levels;
        let mergedPeak = videoSample.peak;

        if (trackAnalyser && trackTimeRef.current) {
          const trackSample = readTimeDomainLevels(
            trackAnalyser,
            trackTimeRef.current,
            BAR_COUNT,
          );
          mergedLevels = mergeLevels(videoSample.levels, trackSample.levels);
          mergedPeak = Math.max(videoSample.peak, trackSample.peak);
        }

        const nextLevels = smoothedRef.current.map((prev, i) => {
          const target = mergedLevels[i] ?? 0;
          return prev + (target - prev) * (1 - SMOOTHING);
        });
        smoothedRef.current = nextLevels;

        setReadout({
          levels: nextLevels,
          peakLevel: mergedPeak,
          isHighVolume: mergedPeak >= PLAYBACK_HIGH_VOLUME,
          isClipping: mergedPeak >= PLAYBACK_CLIP_VOLUME,
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
  }, [
    isActive,
    videoRef,
    timelineAudioRef,
    connectVideoAudioGraph,
    connectTimelineAudioGraph,
  ]);

  return readout;
}
