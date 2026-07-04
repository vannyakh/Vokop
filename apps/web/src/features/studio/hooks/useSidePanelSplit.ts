import { useCallback, useEffect, useRef, useState } from 'react';

export type SidePanelEdge = 'left' | 'right';

export interface SidePanelSplitOptions {
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  /** Left panel grows when dragging right; right panel grows when dragging left. */
  edge: SidePanelEdge;
}

function readStoredWidth(key: string, fallback: number, min: number, max: number): number {
  try {
    const raw = localStorage.getItem(key);
    const n = raw ? Number(raw) : NaN;
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  } catch {
    return fallback;
  }
}

export function useSidePanelSplit({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  edge,
}: SidePanelSplitOptions) {
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);
  const [width, setWidth] = useState(() =>
    readStoredWidth(storageKey, defaultWidth, minWidth, maxWidth),
  );
  const [dragging, setDragging] = useState(false);

  const clampWidth = useCallback(
    (value: number) => Math.min(maxWidth, Math.max(minWidth, value)),
    [minWidth, maxWidth],
  );

  const onSplitterPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startW: width };
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [width],
  );

  const onSplitterPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging || !dragRef.current) return;
      const delta =
        edge === 'left'
          ? e.clientX - dragRef.current.startX
          : dragRef.current.startX - e.clientX;
      setWidth(clampWidth(dragRef.current.startW + delta));
    },
    [dragging, edge, clampWidth],
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
    document.body.classList.add('studio-side-split-dragging');
    return () => document.body.classList.remove('studio-side-split-dragging');
  }, [dragging]);

  useEffect(() => {
    setWidth((w) => clampWidth(w));
  }, [clampWidth]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(Math.round(width)));
    } catch {
      /* ignore */
    }
  }, [storageKey, width]);

  return {
    width,
    minWidth,
    maxWidth,
    dragging,
    splitterProps: {
      onPointerDown: onSplitterPointerDown,
      onPointerMove: onSplitterPointerMove,
      onPointerUp: onSplitterPointerUp,
      onPointerCancel: onSplitterPointerUp,
    },
  };
}
