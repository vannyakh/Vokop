import { useCallback, useRef } from 'react';
import { useAppStore } from '@/features/project';
import { clampClip } from '@/features/studio/lib/timelineClipUtils';
import type { TimelineClipModel, TimelineTrackId } from '@/features/studio/lib/timelineTypes';

type DragMode = 'move' | 'left' | 'right';

interface DragState {
  trackId: TimelineTrackId;
  clip: TimelineClipModel;
  mode: DragMode;
  startClientX: number;
  origStart: number;
  origDuration: number;
}

export function useTimelineClipDrag(pxPerSec: number, duration: number) {
  const dragRef = useRef<DragState | null>(null);
  const updateSegmentTime = useAppStore((s) => s.updateSegmentTime);
  const updateSegmentDuration = useAppStore((s) => s.updateSegmentDuration);
  const updateCanvasElement = useAppStore((s) => s.updateCanvasElement);
  const setSelectedTimelineClip = useAppStore((s) => s.setSelectedTimelineClip);
  const selectCanvasElement = useAppStore((s) => s.selectCanvasElement);

  const applyCanvasTiming = useCallback(
    (clip: TimelineClipModel, start: number, clipDuration: number) => {
      updateCanvasElement(clip.id, {
        startTime: start,
        endTime: start + clipDuration,
      });
    },
    [updateCanvasElement],
  );

  const applyClipPatch = useCallback(
    (trackId: TimelineTrackId, clip: TimelineClipModel, patch: { start?: number; duration?: number }) => {
      if (clip.canvasKind) {
        const start = patch.start ?? clip.start;
        const clipDuration = patch.duration ?? clip.duration;
        applyCanvasTiming(clip, start, clipDuration);
        return;
      }

      if (!clip.segmentType || clip.segmentIndex === undefined) return;

      if (patch.duration !== undefined && patch.start === undefined) {
        updateSegmentDuration(clip.segmentIndex, patch.duration, clip.segmentType);
        return;
      }

      if (patch.start !== undefined) {
        if (patch.duration !== undefined) {
          updateSegmentTime(clip.segmentIndex, patch.start, clip.segmentType);
          updateSegmentDuration(clip.segmentIndex, patch.duration, clip.segmentType);
        } else {
          updateSegmentTime(clip.segmentIndex, patch.start, clip.segmentType);
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
        const { start, duration: clipDuration } = clampClip(
          d.origStart + deltaSec,
          d.origDuration,
          duration,
        );
        applyClipPatch(d.trackId, d.clip, { start, duration: clipDuration });
      } else if (d.mode === 'right') {
        const clipDuration = Math.max(
          0.4,
          Math.min(duration - d.origStart, d.origDuration + deltaSec),
        );
        applyClipPatch(d.trackId, d.clip, { duration: clipDuration });
      } else if (d.mode === 'left') {
        const end = d.origStart + d.origDuration;
        const rawStart = d.origStart + deltaSec;
        const start = Math.max(0, Math.min(end - 0.4, rawStart));
        applyClipPatch(d.trackId, d.clip, { start, duration: end - start });
      }
    },
    [pxPerSec, duration, applyClipPatch],
  );

  const onDragEnd = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
  }, [onDragMove]);

  const beginClipDrag = useCallback(
    (
      e: React.PointerEvent,
      trackId: TimelineTrackId,
      clip: TimelineClipModel,
      mode: DragMode,
    ) => {
      if (!clip.segmentType && !clip.canvasKind) return;

      e.stopPropagation();
      const selection = { trackId, clipId: clip.id };
      setSelectedTimelineClip(selection);
      if (trackId === 'text' || trackId === 'overlay') {
        selectCanvasElement(clip.id);
      }

      dragRef.current = {
        trackId,
        clip,
        mode,
        startClientX: e.clientX,
        origStart: clip.start,
        origDuration: clip.duration,
      };

      window.addEventListener('pointermove', onDragMove);
      window.addEventListener('pointerup', onDragEnd);
    },
    [onDragMove, onDragEnd, setSelectedTimelineClip, selectCanvasElement],
  );

  return { beginClipDrag };
}
