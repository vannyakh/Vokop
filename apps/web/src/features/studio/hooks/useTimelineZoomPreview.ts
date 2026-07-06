import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/features/project';
import {
  TIMELINE_ZOOM_MAX,
  TIMELINE_ZOOM_MIN,
} from '@/features/studio/lib/timelineTypes';

const COMMIT_MS = 120;

function clampZoom(zoom: number) {
  return Math.min(TIMELINE_ZOOM_MAX, Math.max(TIMELINE_ZOOM_MIN, zoom));
}

/** Smooth timeline zoom — local preview while dragging, debounced store commit. */
export function useTimelineZoomPreview() {
  const storeZoom = useAppStore((s) => s.timelineZoom);
  const setStoreZoom = useAppStore((s) => s.setTimelineZoom);
  const [displayZoom, setDisplayZoom] = useState(storeZoom);
  const [isZooming, setIsZooming] = useState(false);
  const draggingRef = useRef(false);
  const commitTimerRef = useRef<number | null>(null);
  const displayZoomRef = useRef(displayZoom);

  displayZoomRef.current = displayZoom;

  useEffect(() => {
    if (!draggingRef.current) setDisplayZoom(storeZoom);
  }, [storeZoom]);

  useEffect(
    () => () => {
      if (commitTimerRef.current != null) window.clearTimeout(commitTimerRef.current);
    },
    [],
  );

  const commitZoom = useCallback(
    (zoom: number) => {
      setStoreZoom(clampZoom(zoom));
    },
    [setStoreZoom],
  );

  const setZoom = useCallback(
    (zoom: number) => {
      const next = clampZoom(zoom);
      setDisplayZoom(next);

      if (draggingRef.current) {
        setIsZooming(true);
        if (commitTimerRef.current != null) window.clearTimeout(commitTimerRef.current);
        commitTimerRef.current = window.setTimeout(() => {
          commitZoom(next);
          commitTimerRef.current = null;
          if (!draggingRef.current) setIsZooming(false);
        }, COMMIT_MS);
        return;
      }

      setIsZooming(true);
      commitZoom(next);
      window.setTimeout(() => setIsZooming(false), COMMIT_MS);
    },
    [commitZoom],
  );

  const onZoomSliderPointerDown = useCallback(() => {
    draggingRef.current = true;
    setIsZooming(true);
  }, []);

  const endZoomDrag = useCallback(() => {
    draggingRef.current = false;
    if (commitTimerRef.current != null) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    commitZoom(displayZoomRef.current);
    setIsZooming(false);
  }, [commitZoom]);

  return {
    displayZoom,
    isZooming,
    setZoom,
    zoomSliderProps: {
      onPointerDown: onZoomSliderPointerDown,
      onPointerUp: endZoomDrag,
      onPointerCancel: endZoomDrag,
    },
  };
}
