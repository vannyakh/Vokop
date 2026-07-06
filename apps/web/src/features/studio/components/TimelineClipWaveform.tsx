import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import type { TimelineClipModel, TimelineTrackType } from '@/features/studio/lib/timelineTypes';
import { resolveClipAudioSource } from '@/features/studio/lib/resolveClipAudioSource';
import { getMediaFile } from '@/features/studio/lib/mediaLibrary';
import {
  computeWaveformBarCount,
  drawTimelineWaveform,
  getAudioPeaks,
  getCachedAudioPeaks,
  MAX_WAVEFORM_CANVAS_PX,
  peaksForClipRegion,
  resolveWaveformViewport,
  type PeakEntry,
} from '@/features/studio/lib/timelineAudioPeaks';
import {
  PLAYBACK_CLIP_VOLUME,
  PLAYBACK_HIGH_VOLUME,
} from '@/features/audio/hooks/useAudioVisualizer';

interface TimelineClipWaveformProps {
  clip: TimelineClipModel;
  width: number;
  height: number;
  trackType: TimelineTrackType;
  clipLeftPx?: number;
  timelineScrollLeft?: number;
  timelineViewportWidth?: number;
  /** Stretch existing waveform bitmap while trimming — avoids async peak rebuild every frame. */
  stretchOnly?: boolean;
  /** Playhead is inside this clip during playback. */
  underPlayhead?: boolean;
  /** 0–1 position of playhead within the clip. */
  playheadRatio?: number;
  /** Live output peak from the playback monitor (0–1). */
  livePeakLevel?: number;
}

const WAVE_COLORS: Record<string, { fill: string; bg: string; glow?: string; hot: string; clip: string }> = {
  audio: {
    fill: 'rgba(45, 230, 212, 0.96)',
    bg: '#030e0c',
    hot: 'rgba(251, 191, 36, 0.98)',
    clip: 'rgba(239, 68, 68, 0.98)',
  },
  sound: {
    fill: 'rgba(251, 191, 36, 0.98)',
    glow: 'rgba(251, 191, 36, 0.08)',
    bg: '#0a0f0c',
    hot: 'rgba(251, 146, 60, 0.98)',
    clip: 'rgba(239, 68, 68, 0.98)',
  },
  video: {
    fill: 'rgba(255, 255, 255, 0.92)',
    bg: '#0a0a0a',
    hot: 'rgba(251, 191, 36, 0.92)',
    clip: 'rgba(239, 68, 68, 0.92)',
  },
};

function paintWaveform(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  entry: PeakEntry,
  clip: TimelineClipModel,
  sourceMediaDuration: number,
  colors: (typeof WAVE_COLORS)[string],
  waveStyle: 'audio' | 'sound' | 'video',
  viewport: { startPx: number; widthPx: number } | null,
): boolean {
  const dpr = window.devicePixelRatio || 1;
  let regionStart = clip.sourceStart ?? 0;
  let regionDuration = clip.duration;
  let layoutLeft = 0;
  let layoutWidth = width;

  if (viewport && width > 0) {
    const t0 = viewport.startPx / width;
    const t1 = (viewport.startPx + viewport.widthPx) / width;
    regionStart += t0 * clip.duration;
    regionDuration = Math.max(0.01, (t1 - t0) * clip.duration);
    layoutLeft = viewport.startPx;
    layoutWidth = viewport.widthPx;
  }

  const layoutCanvasPx = Math.floor(layoutWidth * dpr);
  const bitmapPx = Math.min(layoutCanvasPx, MAX_WAVEFORM_CANVAS_PX);
  const barCount = computeWaveformBarCount(bitmapPx, waveStyle);

  canvas.width = bitmapPx;
  canvas.height = Math.max(1, Math.floor(height * dpr));
  canvas.style.width = `${layoutWidth}px`;
  canvas.style.height = `${height}px`;
  canvas.style.left = layoutLeft > 0 ? `${layoutLeft}px` : '0';
  canvas.style.position = 'absolute';
  canvas.style.top = '0';

  const clipMediaSpan = (clip.sourceStart ?? 0) + clip.duration;
  const mediaDur =
    entry.duration > 0
      ? entry.duration
      : Math.max(sourceMediaDuration || 0, clipMediaSpan);
  const region = peaksForClipRegion(
    entry.peaks,
    mediaDur,
    regionStart,
    regionDuration,
    barCount,
  );
  return drawTimelineWaveform(canvas, region, colors, waveStyle);
}

export function TimelineClipWaveform({
  clip,
  width,
  height,
  trackType,
  clipLeftPx = 0,
  timelineScrollLeft = 0,
  timelineViewportWidth = 0,
  stretchOnly = false,
  underPlayhead = false,
  playheadRatio,
  livePeakLevel = 0,
}: TimelineClipWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [peakEntry, setPeakEntry] = useState<PeakEntry | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const sourceKeyRef = useRef<string | null>(null);

  const videoUrl = useAppStore((s) => s.videoUrl);
  const videoFile = useAppStore((s) => s.videoFile);
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

  const waveStyle = trackType === 'sound' ? 'sound' : trackType === 'video' ? 'video' : 'audio';
  const colors = WAVE_COLORS[waveStyle];
  const liveHot = livePeakLevel >= PLAYBACK_HIGH_VOLUME;
  const liveClipping = livePeakLevel >= PLAYBACK_CLIP_VOLUME;
  const liveBarPct = Math.round(Math.max(18, Math.min(100, livePeakLevel * 100)));

  const viewport = useMemo(
    () =>
      resolveWaveformViewport(
        width,
        clipLeftPx,
        timelineScrollLeft,
        timelineViewportWidth || (typeof window !== 'undefined' ? window.innerWidth : 1280),
      ),
    [width, clipLeftPx, timelineScrollLeft, timelineViewportWidth],
  );

  const peakFile = useMemo(() => {
    if (!source) return null;
    if (source.assetId) return getMediaFile(source.assetId) ?? null;
    if (source.isVideoSource && videoFile) return videoFile;
    return null;
  }, [source, videoFile]);

  const peaksRequestKey = source
    ? `${source.key}:${peakFile ? `file:${peakFile.size}` : 'url'}`
    : null;

  useEffect(() => {
    if (stretchOnly || !source || !peaksRequestKey) {
      if (!source) {
        sourceKeyRef.current = null;
        setPeakEntry(null);
        setReady(false);
        setLoadError(false);
      }
      return;
    }

    if (sourceKeyRef.current === peaksRequestKey) return;
    sourceKeyRef.current = peaksRequestKey;
    setLoadError(false);

    const cached = getCachedAudioPeaks(source.key);
    if (cached && cached.duration >= source.mediaDuration * 0.85) {
      setPeakEntry(cached);
      return;
    }

    setPeakEntry(null);
    setReady(false);

    let cancelled = false;
    void getAudioPeaks(source.key, source.url, {
      file: peakFile,
      isVideoSource: source.isVideoSource,
      expectedDuration: source.mediaDuration,
    })
      .then((entry) => {
        if (cancelled) return;
        setPeakEntry(entry);
      })
      .catch(() => {
        if (!cancelled) {
          setPeakEntry(null);
          setReady(false);
          setLoadError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [source, stretchOnly, peakFile, peaksRequestKey]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width < 4 || height < 4) {
      if (!peakEntry) setReady(false);
      return;
    }

    if (stretchOnly) {
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      return;
    }

    if (!peakEntry || !source) {
      setReady(false);
      return;
    }

    const drew = paintWaveform(
      canvas,
      width,
      height,
      peakEntry,
      clip,
      source.mediaDuration,
      colors,
      waveStyle,
      viewport,
    );
    setReady(drew);
  }, [
    peakEntry,
    source,
    width,
    height,
    clip.sourceStart,
    clip.duration,
    colors,
    waveStyle,
    stretchOnly,
    viewport,
  ]);

  if (!source) return null;

  const showLive = underPlayhead && playheadRatio != null && playheadRatio >= 0 && playheadRatio <= 1;
  const isLoading = !stretchOnly && !ready && !loadError;

  return (
    <div
      className={cn(
        'studio-timeline-clip-waveform-wrap',
        `studio-timeline-clip-waveform-wrap--${waveStyle}`,
        viewport && 'is-viewport-window',
        isLoading && 'is-loading',
        showLive && liveHot && 'is-live-hot',
        showLive && liveClipping && 'is-live-clipping',
      )}
    >
      <canvas
        ref={canvasRef}
        className={cn(
          'studio-timeline-clip-waveform',
          `studio-timeline-clip-waveform--${waveStyle}`,
          ready && 'is-ready',
        )}
        aria-hidden
      />
      {isLoading && (
        <div
          className="studio-timeline-clip-waveform-loading"
          aria-busy="true"
          aria-label="Loading waveform"
        >
          <div className="studio-timeline-clip-waveform-loading-bars" aria-hidden>
            {Array.from({ length: 24 }, (_, i) => (
              <span
                key={i}
                className="studio-timeline-clip-waveform-loading-bar"
                style={{ animationDelay: `${(i % 8) * 0.08}s` }}
              />
            ))}
          </div>
          {width > 88 && waveStyle !== 'video' && (
            <span className="studio-timeline-clip-waveform-loading-label">
              <Loader2 size={11} className="animate-spin studio-timeline-clip-waveform-loading-spin" aria-hidden />
              Loading audio…
            </span>
          )}
        </div>
      )}
      {showLive && (
        <>
          <div
            className="studio-timeline-clip-waveform-live-line"
            style={{ left: `${playheadRatio * 100}%` }}
            aria-hidden
          />
          <div
            className={cn(
              'studio-timeline-clip-waveform-live-bar',
              liveClipping && 'is-clipping',
              liveHot && !liveClipping && 'is-hot',
            )}
            style={{
              left: `${playheadRatio * 100}%`,
              height: `${liveBarPct}%`,
            }}
            aria-hidden
          />
        </>
      )}
    </div>
  );
}
