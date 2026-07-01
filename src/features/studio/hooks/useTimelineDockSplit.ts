import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'vokop-timeline-dock-height';
const DEFAULT_HEIGHT = 300;
const MIN_HEIGHT = 200;
const MAX_HEIGHT_RATIO = 0.72;

function readStoredHeight(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n >= MIN_HEIGHT ? n : DEFAULT_HEIGHT;
  } catch {
    return DEFAULT_HEIGHT;
  }
}

export function useTimelineDockSplit() {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);
  const [height, setHeight] = useState(readStoredHeight);
  const [dragging, setDragging] = useState(false);

  const maxHeight = useCallback(() => {
    const el = containerRef.current;
    const base = el?.clientHeight ?? window.innerHeight * 0.55;
    return Math.max(MIN_HEIGHT + 80, base * MAX_HEIGHT_RATIO);
  }, []);

  const onSplitterPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragRef.current = { startY: e.clientY, startH: height };
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [height],
  );

  const onSplitterPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging || !dragRef.current) return;
      const delta = dragRef.current.startY - e.clientY;
      const next = Math.min(maxHeight(), Math.max(MIN_HEIGHT, dragRef.current.startH + delta));
      setHeight(next);
    },
    [dragging, maxHeight],
  );

  const onSplitterPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    setDragging(false);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    document.body.classList.add('studio-panel-split-dragging');
    return () => document.body.classList.remove('studio-panel-split-dragging');
  }, [dragging]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Math.round(height)));
    } catch {
      /* ignore */
    }
  }, [height]);

  return {
    containerRef,
    dockHeight: height,
    dragging,
    splitterProps: {
      onPointerDown: onSplitterPointerDown,
      onPointerMove: onSplitterPointerMove,
      onPointerUp: onSplitterPointerUp,
      onPointerCancel: onSplitterPointerUp,
    },
  };
}
