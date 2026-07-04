import { useCallback, useRef, useState } from 'react';
import { useAppStore } from '@/features/project';
import { clampClip } from '@/features/studio/lib/timelineClipUtils';
import { timeToPx } from '@/features/studio/lib/timelineUtils';
import type {
  TimelineClipModel,
  TimelineTrackId,
  TimelineTrackModel,
} from '@/features/studio/lib/timelineTypes';
import { TRACK_HEIGHT } from '@/features/studio/lib/timelineTypes';
import { clipCanMoveToTrack } from '@/features/studio/lib/timelineTrackUtils';

type DragMode = 'move' | 'left' | 'right';

const SNAP_PX = 8;

interface DragState {
  trackId: TimelineTrackId;
  clip: TimelineClipModel;
  mode: DragMode;
  startClientX: number;
  startClientY: number;
  origStart: number;
  origDuration: number;
  trackClips: TimelineClipModel[];
}

export interface TimelineDragSnap {
  /** pixel position of snap indicator line */
  snapX: number;
  trackId: TimelineTrackId;
}

export function useTimelineClipDrag(
  pxPerSec: number,
  duration: number,
  tracks: TimelineTrackModel[],
  tracksContainerRef: React.RefObject<HTMLDivElement | null>,
) {
  const dragRef = useRef<DragState | null>(null);
  const [snapIndicator, setSnapIndicator] = useState<TimelineDragSnap | null>(null);
  const [hoverTrackId, setHoverTrackId] = useState<string | null>(null);

  const updateSegmentTime = useAppStore((s) => s.updateSegmentTime);
  const updateSegmentDuration = useAppStore((s) => s.updateSegmentDuration);
  const updateCanvasElement = useAppStore((s) => s.updateCanvasElement);
  const updateMediaClip = useAppStore((s) => s.updateMediaClip);
  const commitProjectHistory = useAppStore((s) => s.commitProjectHistory);
  const setSelectedTimelineClip = useAppStore((s) => s.setSelectedTimelineClip);
  const selectCanvasElement = useAppStore((s) => s.selectCanvasElement);
  const moveTimelineClipToTrack = useAppStore((s) => s.moveTimelineClipToTrack);

  const resolveTrackAtY = useCallback(
    (clientY: number): TimelineTrackModel | null => {
      const el = tracksContainerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      let y = clientY - rect.top;
      if (y < 0) return tracks[0] ?? null;
      for (const track of tracks) {
        const h = TRACK_HEIGHT[track.type];
        if (y <= h) return track;
        y -= h;
      }
      return tracks[tracks.length - 1] ?? null;
    },
    [tracks, tracksContainerRef],
  );

  const computeSnap = useCallback(
    (
      rawStart: number,
      clipDuration: number,
      allClips: TimelineClipModel[],
      excludeId: string,
    ): { start: number; snapX: number | null } => {
      const threshold = SNAP_PX / pxPerSec;
      const edges: number[] = [0, duration];

      for (const c of allClips) {
        if (c.id === excludeId) continue;
        edges.push(c.start, c.start + c.duration);
      }

      let bestStart = rawStart;
      let bestDist = threshold + 1;
      let bestEdge: number | null = null;

      const anchorEnd = rawStart + clipDuration;
      for (const edge of edges) {
        const dS = Math.abs(rawStart - edge);
        if (dS < bestDist) {
          bestDist = dS;
          bestStart = edge;
          bestEdge = edge;
        }
        const dE = Math.abs(anchorEnd - edge);
        if (dE < bestDist) {
          bestDist = dE;
          bestStart = edge - clipDuration;
          bestEdge = edge;
        }
      }

      return {
        start: bestEdge !== null ? bestStart : rawStart,
        snapX: bestEdge !== null ? timeToPx(bestEdge, pxPerSec) : null,
      };
    },
    [pxPerSec, duration],
  );

  const applyCanvasTiming = useCallback(
    (clip: TimelineClipModel, start: number, clipDuration: number) => {
      updateCanvasElement(
        clip.id,
        { startTime: start, endTime: start + clipDuration },
        { history: false },
      );
    },
    [updateCanvasElement],
  );

  const applyMediaTiming = useCallback(
    (
      clip: TimelineClipModel,
      start: number,
      clipDuration: number,
      mode: DragMode,
      origStart: number,
    ) => {
      const baseSource = clip.sourceStart ?? 0;
      const sourceStart =
        mode === 'left' ? Math.max(0, baseSource + (start - origStart)) : baseSource;
      updateMediaClip(
        clip.id,
        { start, duration: clipDuration, sourceStart },
        { history: false },
      );
    },
    [updateMediaClip],
  );

  const applyClipPatch = useCallback(
    (
      trackId: TimelineTrackId,
      clip: TimelineClipModel,
      patch: { start?: number; duration?: number },
      mode: DragMode,
      origStart: number,
    ) => {
      if (clip.mediaKind) {
        applyMediaTiming(
          clip,
          patch.start ?? clip.start,
          patch.duration ?? clip.duration,
          mode,
          origStart,
        );
        return;
      }
      if (clip.canvasKind) {
        applyCanvasTiming(clip, patch.start ?? clip.start, patch.duration ?? clip.duration);
        return;
      }
      if (!clip.segmentType || clip.segmentIndex === undefined) return;

      if (patch.duration !== undefined && patch.start === undefined) {
        updateSegmentDuration(clip.segmentIndex, patch.duration, clip.segmentType);
        return;
      }
      if (patch.start !== undefined) {
        updateSegmentTime(clip.segmentIndex, patch.start, clip.segmentType);
        if (patch.duration !== undefined) {
          updateSegmentDuration(clip.segmentIndex, patch.duration, clip.segmentType);
        }
      }
    },
    [updateSegmentTime, updateSegmentDuration, applyCanvasTiming, applyMediaTiming],
  );

  const onDragMove = useCallback(
    (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || !duration) return;

      const deltaSec = (e.clientX - d.startClientX) / pxPerSec;

      // Cross-track move for canvas-backed clips
      if (d.mode === 'move' && (d.clip.canvasKind || d.clip.mediaKind === 'audio')) {
        const over = resolveTrackAtY(e.clientY);
        if (over && String(over.id) !== String(d.trackId)) {
          if (clipCanMoveToTrack(d.clip, String(over.id), over.type)) {
            moveTimelineClipToTrack(d.clip.id, String(d.trackId), String(over.id));
            d.trackId = over.id as TimelineTrackId;
            d.trackClips = over.clips;
            setHoverTrackId(String(over.id));
            setSelectedTimelineClip({ trackId: over.id as TimelineTrackId, clipId: d.clip.id });
          } else {
            setHoverTrackId(null);
          }
        } else {
          setHoverTrackId(over ? String(over.id) : null);
        }
      }

      if (d.mode === 'move') {
        const { start: snapped, snapX } = computeSnap(
          d.origStart + deltaSec,
          d.origDuration,
          d.trackClips,
          d.clip.id,
        );
        const { start, duration: clipDur } = clampClip(snapped, d.origDuration, duration);
        applyClipPatch(d.trackId, d.clip, { start, duration: clipDur }, d.mode, d.origStart);
        setSnapIndicator(snapX != null ? { snapX, trackId: d.trackId } : null);
      } else if (d.mode === 'right') {
        const clipDur = Math.max(0.4, Math.min(duration - d.origStart, d.origDuration + deltaSec));
        applyClipPatch(d.trackId, d.clip, { duration: clipDur }, d.mode, d.origStart);
        setSnapIndicator(null);
      } else if (d.mode === 'left') {
        const end = d.origStart + d.origDuration;
        const rawStart = d.origStart + deltaSec;
        const start = Math.max(0, Math.min(end - 0.4, rawStart));
        applyClipPatch(d.trackId, d.clip, { start, duration: end - start }, d.mode, d.origStart);
        setSnapIndicator(null);
      }
    },
    [
      pxPerSec,
      duration,
      applyClipPatch,
      computeSnap,
      resolveTrackAtY,
      moveTimelineClipToTrack,
      setSelectedTimelineClip,
    ],
  );

  const onDragEnd = useCallback(() => {
    dragRef.current = null;
    setSnapIndicator(null);
    setHoverTrackId(null);
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
  }, [onDragMove]);

  const beginClipDrag = useCallback(
    (
      e: React.PointerEvent,
      trackId: TimelineTrackId,
      clip: TimelineClipModel,
      mode: DragMode,
      trackClips: TimelineClipModel[] = [],
    ) => {
      if (!clip.segmentType && !clip.canvasKind && !clip.mediaKind) return;

      e.stopPropagation();
      commitProjectHistory();
      setSelectedTimelineClip({ trackId, clipId: clip.id });
      if (clip.canvasKind) {
        selectCanvasElement(clip.id);
      }

      dragRef.current = {
        trackId,
        clip,
        mode,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origStart: clip.start,
        origDuration: clip.duration,
        trackClips,
      };

      window.addEventListener('pointermove', onDragMove);
      window.addEventListener('pointerup', onDragEnd);
    },
    [commitProjectHistory, onDragMove, onDragEnd, setSelectedTimelineClip, selectCanvasElement],
  );

  return { beginClipDrag, snapIndicator, hoverTrackId };
}
