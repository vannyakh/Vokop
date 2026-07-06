import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import type { TimelineTrackModel } from '@/features/studio/lib/timelineTypes';
import {
  clampTrackHeight,
  isCompactTrackHeight,
  resolveTrackHeight,
} from '@/features/studio/lib/timelineTypes';

const STORAGE_KEY = 'vokop-timeline-track-heights';

function readStoredHeights(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export interface TrackResizeHandleProps {
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => void;
}

interface TrackHeightDragRefs {
  headerColRef: RefObject<HTMLDivElement | null>;
  tracksContainerRef: RefObject<HTMLDivElement | null>;
}

interface CachedTrackNodes {
  header: HTMLElement | null;
  lane: HTMLElement | null;
}

export function useTimelineTrackHeights(
  tracks: TimelineTrackModel[],
  { headerColRef, tracksContainerRef }: TrackHeightDragRefs,
) {
  const [overrides, setOverrides] = useState<Record<string, number>>(readStoredHeights);
  const dragRef = useRef<{
    trackId: string;
    startY: number;
    startH: number;
    type: TimelineTrackModel['type'];
    nodes: CachedTrackNodes;
  } | null>(null);
  const pendingHeightRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const resizingTrackIdRef = useRef<string | null>(null);

  const getHeight = useCallback(
    (track: TimelineTrackModel) => resolveTrackHeight(track.type, overrides, String(track.id)),
    [overrides],
  );

  const trackHeights = useMemo(() => tracks.map(getHeight), [tracks, getHeight]);

  const trackTops = useMemo(() => {
    let acc = 0;
    return trackHeights.map((h) => {
      const top = acc;
      acc += h;
      return top;
    });
  }, [trackHeights]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } catch {
      /* ignore */
    }
  }, [overrides]);

  const findTrackNodes = useCallback(
    (trackId: string): CachedTrackNodes => ({
      header: headerColRef.current?.querySelector(
        `[data-track-id="${trackId}"]`,
      ) as HTMLElement | null,
      lane: tracksContainerRef.current?.querySelector(
        `[data-track-id="${trackId}"]`,
      ) as HTMLElement | null,
    }),
    [headerColRef, tracksContainerRef],
  );

  const applyPreviewHeight = useCallback(
    (nodes: CachedTrackNodes, height: number) => {
      const compact = isCompactTrackHeight(height);
      if (nodes.header) {
        nodes.header.style.height = `${height}px`;
        nodes.header.classList.toggle('is-compact', compact);
        nodes.header.classList.add('is-resizing');
      }
      if (nodes.lane) {
        nodes.lane.style.height = `${height}px`;
        nodes.lane.classList.add('is-resizing');
      }
    },
    [],
  );

  const clearPreviewStyles = useCallback((nodes: CachedTrackNodes) => {
    if (nodes.header) {
      nodes.header.style.height = '';
      nodes.header.classList.remove('is-resizing');
    }
    if (nodes.lane) {
      nodes.lane.style.height = '';
      nodes.lane.classList.remove('is-resizing');
    }
  }, []);

  const flushPreview = useCallback(() => {
    rafRef.current = null;
    const d = dragRef.current;
    const height = pendingHeightRef.current;
    if (!d || height == null) return;
    applyPreviewHeight(d.nodes, height);
  }, [applyPreviewHeight]);

  const schedulePreview = useCallback(
    (height: number) => {
      pendingHeightRef.current = height;
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(flushPreview);
    },
    [flushPreview],
  );

  const endDrag = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }

      const d = dragRef.current;
      if (d) {
        const finalHeight =
          pendingHeightRef.current ??
          clampTrackHeight(d.type, d.startH + (e.clientY - d.startY));
        clearPreviewStyles(d.nodes);
        setOverrides((prev) => ({ ...prev, [d.trackId]: finalHeight }));
      }

      dragRef.current = null;
      pendingHeightRef.current = null;
      resizingTrackIdRef.current = null;
      document.body.classList.remove('studio-track-height-dragging');
    },
    [clearPreviewStyles],
  );

  const getResizeHandleProps = useCallback(
    (track: TimelineTrackModel, currentHeight: number): TrackResizeHandleProps => ({
      onPointerDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
        const nodes = findTrackNodes(String(track.id));
        dragRef.current = {
          trackId: String(track.id),
          startY: e.clientY,
          startH: currentHeight,
          type: track.type,
          nodes,
        };
        pendingHeightRef.current = currentHeight;
        resizingTrackIdRef.current = String(track.id);
        document.body.classList.add('studio-track-height-dragging');
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove: (e) => {
        const d = dragRef.current;
        if (!d || d.trackId !== String(track.id)) return;
        const delta = e.clientY - d.startY;
        const next = clampTrackHeight(d.type, d.startH + delta);
        schedulePreview(next);
      },
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    }),
    [endDrag, findTrackNodes, schedulePreview],
  );

  return {
    getHeight,
    trackHeights,
    trackTops,
    getResizeHandleProps,
    /** Stable ref — no re-renders when resize starts/ends. */
    resizingTrackIdRef,
  };
};
