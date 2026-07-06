import { useCallback, useRef, useState } from 'react';
import { useAppStore } from '@/features/project';
import { clampClip } from '@/features/studio/lib/timelineClipUtils';
import { timeToPx } from '@/features/studio/lib/timelineUtils';
import type {
  TimelineClipModel,
  TimelineTrackId,
  TimelineTrackModel,
} from '@/features/studio/lib/timelineTypes';
import { clipCanMoveToTrack } from '@/features/studio/lib/timelineTrackUtils';
import { studioEdit } from '@/features/studio/services/studioEdit';

type DragMode = 'move' | 'left' | 'right';

const SNAP_PX = 8;

interface DragState {
  trackId: TimelineTrackId;
  fromTrackId: TimelineTrackId;
  clip: TimelineClipModel;
  mode: DragMode;
  startClientX: number;
  startClientY: number;
  origStart: number;
  origDuration: number;
  origSourceStart: number;
  trackClips: TimelineClipModel[];
  /** Pixel width at drag start — keeps filmstrip stable while resizing. */
  filmstripBaseWidth: number;
}

export interface TimelineClipDragPreview {
  clipId: string;
  clip: TimelineClipModel;
  fromTrackId: TimelineTrackId;
  trackId: TimelineTrackId;
  start: number;
  duration: number;
  sourceStart?: number;
  filmstripBaseWidth: number;
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
  trackHeights: number[],
  tracksContainerRef: React.RefObject<HTMLDivElement | null>,
) {
  const dragRef = useRef<DragState | null>(null);
  const pendingPreviewRef = useRef<TimelineClipDragPreview | null>(null);
  const rafRef = useRef<number | null>(null);
  const [dragPreview, setDragPreview] = useState<TimelineClipDragPreview | null>(null);
  const [snapIndicator, setSnapIndicator] = useState<TimelineDragSnap | null>(null);
  const [hoverTrackId, setHoverTrackId] = useState<string | null>(null);

  const updateSegmentTime = useAppStore((s) => s.updateSegmentTime);
  const updateSegmentDuration = useAppStore((s) => s.updateSegmentDuration);
  const moveTimelineClipToTrack = useAppStore((s) => s.moveTimelineClipToTrack);
  const resolveTimelineClipOverlap = useAppStore((s) => s.resolveTimelineClipOverlap);

  const flushPreview = useCallback(() => {
    rafRef.current = null;
    const next = pendingPreviewRef.current;
    if (next) setDragPreview(next);
  }, []);

  const schedulePreview = useCallback(
    (preview: TimelineClipDragPreview) => {
      pendingPreviewRef.current = preview;
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(flushPreview);
    },
    [flushPreview],
  );

  const resolveTrackAtY = useCallback(
    (clientY: number): TimelineTrackModel | null => {
      const el = tracksContainerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      let y = clientY - rect.top;
      if (y < 0) return tracks[0] ?? null;
      for (let i = 0; i < tracks.length; i++) {
        const h = trackHeights[i] ?? 40;
        if (y <= h) return tracks[i] ?? null;
        y -= h;
      }
      return tracks[tracks.length - 1] ?? null;
    },
    [tracks, trackHeights, tracksContainerRef],
  );

  const computeSnap = useCallback(
    (
      rawStart: number,
      clipDuration: number,
      allClips: TimelineClipModel[],
      excludeId: string,
      timelineDuration: number,
    ): { start: number; snapX: number | null } => {
      const threshold = SNAP_PX / pxPerSec;
      const edges: number[] = [0, timelineDuration];

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
    [pxPerSec],
  );

  const commitPreview = useCallback(
    (preview: TimelineClipDragPreview, mode: DragMode) => {
      const { clip, fromTrackId, trackId, start, duration: clipDuration, sourceStart } = preview;

      if (clip.mediaKind) {
        studioEdit.updateMediaClip(
          clip.id,
          {
            start,
            duration: clipDuration,
            sourceStart: sourceStart ?? clip.sourceStart ?? 0,
          },
          { history: false },
        );
      } else if (clip.canvasKind) {
        studioEdit.updateCanvasTiming(
          clip.id,
          { startTime: start, endTime: start + clipDuration },
          { history: false },
        );
      } else if (clip.segmentType && clip.segmentIndex !== undefined) {
        if (mode === 'right') {
          updateSegmentDuration(clip.segmentIndex, clipDuration, clip.segmentType);
        } else {
          updateSegmentTime(clip.segmentIndex, start, clip.segmentType);
          if (mode === 'left') {
            updateSegmentDuration(clip.segmentIndex, clipDuration, clip.segmentType);
          }
        }
      }

      if (String(fromTrackId) !== String(trackId)) {
        moveTimelineClipToTrack(clip.id, String(fromTrackId), String(trackId));
      }

      if (mode === 'move' && (clip.canvasKind || clip.mediaKind)) {
        resolveTimelineClipOverlap(clip.id, String(trackId));
      }
    },
    [
      moveTimelineClipToTrack,
      updateSegmentTime,
      updateSegmentDuration,
      resolveTimelineClipOverlap,
    ],
  );

  const onDragMove = useCallback(
    (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const timelineDuration =
        duration > 0 ? duration : Math.max(d.origStart + d.origDuration + 60, 60);

      const deltaSec = (e.clientX - d.startClientX) / pxPerSec;
      let trackId = d.trackId;
      let start = d.origStart;
      let clipDuration = d.origDuration;
      let sourceStart = d.origSourceStart;
      let snapX: number | null = null;

      if (
        d.mode === 'move' &&
        (d.clip.canvasKind || d.clip.mediaKind === 'audio' || d.clip.mediaKind === 'video')
      ) {
        const over = resolveTrackAtY(e.clientY);
        if (over && clipCanMoveToTrack(d.clip, String(over.id), over.type)) {
          trackId = over.id as TimelineTrackId;
          setHoverTrackId(String(over.id));
        } else {
          setHoverTrackId(over ? String(over.id) : null);
        }
      }

      if (d.mode === 'move') {
        const snapped = computeSnap(
          d.origStart + deltaSec,
          d.origDuration,
          d.trackClips,
          d.clip.id,
          timelineDuration,
        );
        snapX = snapped.snapX;
        const clamped = clampClip(snapped.start, d.origDuration, timelineDuration);
        start = clamped.start;
        clipDuration = clamped.duration;
        setSnapIndicator(snapX != null ? { snapX, trackId } : null);
      } else if (d.mode === 'right') {
        clipDuration = Math.max(
          0.4,
          Math.min(timelineDuration - d.origStart, d.origDuration + deltaSec),
        );
        setSnapIndicator(null);
      } else if (d.mode === 'left') {
        const end = d.origStart + d.origDuration;
        const rawStart = d.origStart + deltaSec;
        start = Math.max(0, Math.min(end - 0.4, rawStart));
        clipDuration = end - start;
        sourceStart = Math.max(0, d.origSourceStart + (start - d.origStart));
        setSnapIndicator(null);
      }

      d.trackId = trackId;
      schedulePreview({
        clipId: d.clip.id,
        clip: d.clip,
        fromTrackId: d.fromTrackId,
        trackId,
        start,
        duration: clipDuration,
        sourceStart,
        filmstripBaseWidth: d.filmstripBaseWidth,
      });
    },
    [pxPerSec, duration, computeSnap, resolveTrackAtY, schedulePreview],
  );

  const onDragEnd = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const d = dragRef.current;
    const preview = pendingPreviewRef.current;
    if (d && preview) {
      commitPreview(preview, d.mode);
    }
    dragRef.current = null;
    pendingPreviewRef.current = null;
    setDragPreview(null);
    setSnapIndicator(null);
    setHoverTrackId(null);
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
  }, [commitPreview, onDragMove]);

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
      studioEdit.commitHistory();
      useAppStore.getState().selectTimelineClip(
        { trackId, clipId: clip.id },
        { mode: 'replace', syncCanvas: true },
      );

      const filmstripBaseWidth = Math.max(28, timeToPx(clip.duration, pxPerSec));
      dragRef.current = {
        trackId,
        fromTrackId: trackId,
        clip,
        mode,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origStart: clip.start,
        origDuration: clip.duration,
        origSourceStart: clip.sourceStart ?? 0,
        trackClips,
        filmstripBaseWidth,
      };

      window.addEventListener('pointermove', onDragMove);
      window.addEventListener('pointerup', onDragEnd);
    },
    [onDragMove, onDragEnd, pxPerSec],
  );

  return { beginClipDrag, dragPreview, snapIndicator, hoverTrackId };
}
