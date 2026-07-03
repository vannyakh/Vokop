/**
 * useClipDrag — drag-to-reposition handler for timeline clips.
 * Adapted from Omniclip's effectDragHandler.
 *
 * Tracks a grabbed clip + offset, fires position proposals on pointer move,
 * and calls `onDrop` with the final timeline position when pointer is released.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { pxToMs, msToPx } from '../utils/timeline.js';
import { SNAP_THRESHOLD_PX } from '../constants/layout.js';
import type { AnyClip } from '../types/clip.js';

export interface ClipDragProposal {
  clipId: string;
  /** Proposed new start_at_position in ms */
  proposedPositionMs: number;
  /** Proposed track index */
  proposedTrack: number;
  /** Snap indicator X position in pixels (null when not snapping) */
  snapX: number | null;
}

interface UseClipDragOptions {
  pxPerSec: number;
  durationMs: number;
  clips: AnyClip[];
  trackHeights: number[];
  onDrop: (clipId: string, newPositionMs: number, newTrack: number) => void;
  /** Ref to the timeline scroll container for calculating absolute positions */
  scrollRef?: React.RefObject<HTMLElement | null>;
  timelineRef?: React.RefObject<HTMLElement | null>;
}

interface UseClipDragResult {
  /** True while a clip is being dragged */
  isDragging: boolean;
  /** ID of the currently grabbed clip */
  grabbedClipId: string | null;
  /** Live proposal during drag for rendering ghost/preview */
  proposal: ClipDragProposal | null;
  /** Call on pointerdown on a clip block */
  onClipPointerDown: (
    e: React.PointerEvent,
    clip: AnyClip,
  ) => void;
}

export function useClipDrag(options: UseClipDragOptions): UseClipDragResult {
  const {
    pxPerSec,
    durationMs,
    clips,
    trackHeights,
    onDrop,
    scrollRef,
    timelineRef,
  } = options;

  const pxPerSecRef = useRef(pxPerSec);
  pxPerSecRef.current = pxPerSec;

  const [grabbedClipId, setGrabbedClipId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<ClipDragProposal | null>(null);

  const dragState = useRef<{
    clip: AnyClip;
    offsetX: number;
    offsetY: number;
    timelineLeft: number;
  } | null>(null);

  const getScrollLeft = () => scrollRef?.current?.scrollLeft ?? 0;
  const getTimelineLeft = () => timelineRef?.current?.getBoundingClientRect().left ?? 0;

  const resolveTrack = useCallback(
    (clientY: number, timelineTop: number): number => {
      const relY = clientY - timelineTop;
      let acc = 0;
      for (let i = 0; i < trackHeights.length; i++) {
        acc += trackHeights[i];
        if (relY < acc) return i;
      }
      return Math.max(0, trackHeights.length - 1);
    },
    [trackHeights],
  );

  const findSnapX = useCallback(
    (posMs: number, clipId: string): number | null => {
      for (const c of clips) {
        if (c.id === clipId) continue;
        const cStartPx = msToPx(c.start_at_position, pxPerSecRef.current);
        const cEndPx = msToPx(c.start_at_position + (c.end - c.start), pxPerSecRef.current);
        const targetPx = msToPx(posMs, pxPerSecRef.current);
        if (Math.abs(targetPx - cStartPx) <= SNAP_THRESHOLD_PX) return cStartPx;
        if (Math.abs(targetPx - cEndPx) <= SNAP_THRESHOLD_PX) return cEndPx;
      }
      return null;
    },
    [clips],
  );

  const onClipPointerDown = useCallback(
    (e: React.PointerEvent, clip: AnyClip) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const tl = timelineRef?.current?.getBoundingClientRect();
      dragState.current = {
        clip,
        offsetX: e.nativeEvent.offsetX,
        offsetY: e.nativeEvent.offsetY,
        timelineLeft: tl?.left ?? 0,
      };
      setGrabbedClipId(clip.id);
    },
    [timelineRef],
  );

  useEffect(() => {
    if (!grabbedClipId) return;
    const ds = dragState.current;
    if (!ds) return;

    const onMove = (e: PointerEvent) => {
      const scrollLeft = getScrollLeft();
      const relX = e.clientX - ds.timelineLeft + scrollLeft - ds.offsetX;
      const rawMs = pxToMs(Math.max(0, relX), pxPerSecRef.current);
      const clampedMs = Math.min(rawMs, durationMs - (ds.clip.end - ds.clip.start));

      const timelineTop =
        timelineRef?.current?.getBoundingClientRect().top ?? e.clientY;
      const proposedTrack = resolveTrack(e.clientY, timelineTop);

      const snapX = findSnapX(clampedMs, ds.clip.id);
      const finalMs = snapX !== null ? pxToMs(snapX, pxPerSecRef.current) : clampedMs;

      setProposal({
        clipId: ds.clip.id,
        proposedPositionMs: finalMs,
        proposedTrack,
        snapX,
      });
    };

    const onUp = (e: PointerEvent) => {
      if (dragState.current && proposal) {
        onDrop(dragState.current.clip.id, proposal.proposedPositionMs, proposal.proposedTrack);
      }
      dragState.current = null;
      setGrabbedClipId(null);
      setProposal(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grabbedClipId, durationMs, resolveTrack, findSnapX, onDrop]);

  return {
    isDragging: grabbedClipId !== null,
    grabbedClipId,
    proposal,
    onClipPointerDown,
  };
}
