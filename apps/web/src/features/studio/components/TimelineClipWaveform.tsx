import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import type { TimelineClipModel, TimelineTrackType } from '@/features/studio/lib/timelineTypes';
import { resolveClipAudioSource } from '@/features/studio/lib/resolveClipAudioSource';
import {
  drawTimelineWaveform,
  getAudioPeaks,
  peaksForClipRegion,
} from '@/features/studio/lib/timelineAudioPeaks';

interface TimelineClipWaveformProps {
  clip: TimelineClipModel;
  width: number;
  height: number;
  trackType: TimelineTrackType;
  /** Stretch existing waveform bitmap while trimming — avoids async peak rebuild every frame. */
  stretchOnly?: boolean;
}

const WAVE_COLORS: Record<string, { fill: string; bg: string }> = {
  audio: {
    fill: 'rgba(45, 230, 212, 0.96)',   // CapCut-style bright teal
    bg:   'rgba(0, 0, 0, 0.0)',
  },
  sound: {
    fill: 'rgba(72, 240, 170, 0.96)',   // bright mint green
    bg:   'rgba(0, 0, 0, 0.0)',
  },
  video: {
    fill: 'rgba(255, 255, 255, 0.92)',  // embedded footage audio, dark-strip style
    bg:   'rgba(0, 0, 0, 0.0)',
  },
};

export function TimelineClipWaveform({
  clip,
  width,
  height,
  trackType,
  stretchOnly = false,
}: TimelineClipWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  const videoUrl = useAppStore((s) => s.videoUrl);
  const audioBase64 = useAppStore((s) => s.audioBase64);
  const mediaAssets = useAppStore((s) => s.mediaAssets);
  const videoClips = useAppStore((s) => s.videoClips);
  const audioClips = useAppStore((s) => s.audioClips);
  const mediaDuration = useAppStore((s) => s.mediaDuration);
  const duration = useAppStore((s) => s.duration);

  const source = useMemo(
    () =>
      resolveClipAudioSource(clip, {
        videoUrl,
        audioBase64,
        mediaAssets,
        audioClips,
        videoClips,
        mediaDuration,
        duration,
      }),
    [clip, videoUrl, audioBase64, mediaAssets, videoClips, audioClips, mediaDuration, duration],
  );

  const colors = WAVE_COLORS[trackType === 'sound' ? 'sound' : trackType === 'video' ? 'video' : 'audio'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width < 4 || height < 4) {
      setReady(false);
      return;
    }

    if (stretchOnly) {
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      return;
    }

    if (!source) {
      setReady(false);
      return;
    }

    let cancelled = false;
    const dpr = window.devicePixelRatio || 1;
    // 1 bar per 2 physical pixels = maximum DAW signal density
    const canvasPx = Math.floor(width * dpr);
    const barCount = Math.max(32, Math.floor(canvasPx / 2));

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    setReady(false);

    void getAudioPeaks(source.key, source.url)
      .then((entry) => {
        if (cancelled) return;
        const mediaDur = entry.duration || source.mediaDuration || clip.duration;
        const region = peaksForClipRegion(
          entry.peaks,
          mediaDur,
          clip.sourceStart ?? 0,
          clip.duration,
          barCount,
        );
        drawTimelineWaveform(canvas, region, colors);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [source, width, height, clip.sourceStart, clip.duration, colors, stretchOnly]);

  if (!source) return null;

  return (
    <canvas
      ref={canvasRef}
      className={cn('studio-timeline-clip-waveform', ready && 'is-ready')}
      aria-hidden
    />
  );
}
