/**
 * usePlayheadDrag — drag/click handler for the timeline playhead.
 * Adapted from Omniclip's playheadDragHandler.
 *
 * Usage:
 *   const { dragging, onRulerPointerDown, onRulerClick } = usePlayheadDrag({ pxPerSec, onSeek });
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { pxToTime } from '../utils/timeline.js';

interface UsePlayheadDragOptions {
  pxPerSec: number;
  /** Called with the new time in seconds when the user drags/clicks */
  onSeek: (timeSeconds: number) => void;
  /** Ref to the scrollable timeline container (for scroll offset) */
  scrollRef?: React.RefObject<HTMLElement | null>;
}

interface UsePlayheadDragResult {
  dragging: boolean;
  onRulerPointerDown: (e: React.PointerEvent) => void;
  onLanePointerDown: (e: React.PointerEvent) => void;
  onRulerClick: (e: React.MouseEvent) => void;
}

export function usePlayheadDrag(options: UsePlayheadDragOptions): UsePlayheadDragResult {
  const { pxPerSec, onSeek, scrollRef } = options;
  const [dragging, setDragging] = useState(false);
  const pxPerSecRef = useRef(pxPerSec);
  pxPerSecRef.current = pxPerSec;

  const getScrollLeft = useCallback(() => {
    return scrollRef?.current?.scrollLeft ?? 0;
  }, [scrollRef]);

  const seekFromClientX = useCallback(
    (clientX: number, boundsRef: DOMRect) => {
      const x = clientX - boundsRef.left + getScrollLeft();
      onSeek(pxToTime(x, pxPerSecRef.current));
    },
    [onSeek, getScrollLeft],
  );

  const boundsRef = useRef<DOMRect | null>(null);

  const onRulerPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      boundsRef.current = (e.currentTarget as HTMLElement).getBoundingClientRect();
      seekFromClientX(e.clientX, boundsRef.current);
      setDragging(true);
    },
    [seekFromClientX],
  );

  const onLanePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      boundsRef.current = (e.currentTarget as HTMLElement).getBoundingClientRect();
      seekFromClientX(e.clientX, boundsRef.current);
      setDragging(true);
    },
    [seekFromClientX],
  );

  const onRulerClick = useCallback(
    (e: React.MouseEvent) => {
      const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
      seekFromClientX(e.clientX, bounds);
    },
    [seekFromClientX],
  );

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      if (!boundsRef.current) return;
      seekFromClientX(e.clientX, boundsRef.current);
    };
    const onUp = () => setDragging(false);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, seekFromClientX]);

  return { dragging, onRulerPointerDown, onLanePointerDown, onRulerClick };
}
