import { useCallback, useRef, useState } from 'react';
import { useAppStore } from '@/features/project';
import { clampClip } from '@/features/studio/lib/timelineClipUtils';
import { timeToPx } from '@/features/studio/lib/timelineUtils';
import type { TimelineClipModel, TimelineTrackId } from '@/features/studio/lib/timelineTypes';

type DragMode = 'move' | 'left' | 'right';

const SNAP_PX = 8;

interface DragState {
  trackId: TimelineTrackId;
  clip: TimelineClipModel;
  mode: DragMode;
  startClientX: number;
  origStart: number;
  origDuration: number;
  trackClips: TimelineClipModel[];
}

export interface TimelineDragSnap {
  /** pixel position of snap indicator line */
  snapX: number;
  trackId: TimelineTrackId;
}

export function useTimelineClipDrag(pxPerSec: number, duration: number) {
  const dragRef = useRef<DragState | null>(null);
  const [snapIndicator, setSnapIndicator] = useState<TimelineDragSnap | null>(null);

  const updateSegmentTime = useAppStore((s) => s.updateSegmentTime);
  const updateSegmentDuration = useAppStore((s) => s.updateSegmentDuration);
  const updateCanvasElement = useAppStore((s) => s.updateCanvasElement);
  const setSelectedTimelineClip = useAppStore((s) => s.setSelectedTimelineClip);
  const selectCanvasElement = useAppStore((s) => s.selectCanvasElement);

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
        if (dS < bestDist) { bestDist = dS; bestStart = edge; bestEdge = edge; }
        const dE = Math.abs(anchorEnd - edge);
        if (dE < bestDist) { bestDist = dE; bestStart = edge - clipDuration; bestEdge = edge; }
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
      updateCanvasElement(clip.id, { startTime: start, endTime: start + clipDuration });
    },
    [updateCanvasElement],
  );

  const applyClipPatch = useCallback(
    (
      trackId: TimelineTrackId,
      clip: TimelineClipModel,
      patch: { start?: number; duration?: number },
    ) => {
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
    [updateSegmentTime, updateSegmentDuration, applyCanvasTiming],
  );

  const onDragMove = useCallback(
    (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || !duration) return;

      const deltaSec = (e.clientX - d.startClientX) / pxPerSec;

      if (d.mode === 'move') {
        const { start: snapped, snapX } = computeSnap(
          d.origStart + deltaSec,
          d.origDuration,
          d.trackClips,
          d.clip.id,
        );
        const { start, duration: clipDur } = clampClip(snapped, d.origDuration, duration);
        applyClipPatch(d.trackId, d.clip, { start, duration: clipDur });
        setSnapIndicator(snapX != null ? { snapX, trackId: d.trackId } : null);
      } else if (d.mode === 'right') {
        const clipDur = Math.max(0.4, Math.min(duration - d.origStart, d.origDuration + deltaSec));
        applyClipPatch(d.trackId, d.clip, { duration: clipDur });
        setSnapIndicator(null);
      } else if (d.mode === 'left') {
        const end = d.origStart + d.origDuration;
        const rawStart = d.origStart + deltaSec;
        const start = Math.max(0, Math.min(end - 0.4, rawStart));
        applyClipPatch(d.trackId, d.clip, { start, duration: end - start });
        setSnapIndicator(null);
      }
    },
    [pxPerSec, duration, applyClipPatch, computeSnap],
  );

  const onDragEnd = useCallback(() => {
    dragRef.current = null;
    setSnapIndicator(null);
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
      if (!clip.segmentType && !clip.canvasKind) return;

      e.stopPropagation();
      setSelectedTimelineClip({ trackId, clipId: clip.id });
      if (trackId === 'text' || trackId === 'overlay' || String(trackId).startsWith('overlay-')) {
        selectCanvasElement(clip.id);
      }

      dragRef.current = {
        trackId,
        clip,
        mode,
        startClientX: e.clientX,
        origStart: clip.start,
        origDuration: clip.duration,
        trackClips,
      };

      window.addEventListener('pointermove', onDragMove);
      window.addEventListener('pointerup', onDragEnd);
    },
    [onDragMove, onDragEnd, setSelectedTimelineClip, selectCanvasElement],
  );

  return { beginClipDrag, snapIndicator };
}
