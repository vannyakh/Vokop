import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

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
  const dockShellRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);
  const pendingHeightRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const [height, setHeight] = useState(readStoredHeight);
  const [dragging, setDragging] = useState(false);

  const maxHeight = useCallback(() => {
    const el = containerRef.current;
    const base = el?.clientHeight ?? window.innerHeight * 0.55;
    return Math.max(MIN_HEIGHT + 80, base * MAX_HEIGHT_RATIO);
  }, []);

  const clampHeight = useCallback(
    (value: number) => Math.min(maxHeight(), Math.max(MIN_HEIGHT, value)),
    [maxHeight],
  );

  const applyPreviewHeight = useCallback((next: number) => {
    const shell = dockShellRef.current;
    if (!shell) return;
    shell.style.height = `${next}px`;
    shell.classList.add('is-resizing');
  }, []);

  const clearPreviewStyles = useCallback(() => {
    const shell = dockShellRef.current;
    if (!shell) return;
    shell.style.height = '';
    shell.classList.remove('is-resizing');
  }, []);

  const flushPreview = useCallback(() => {
    rafRef.current = null;
    const next = pendingHeightRef.current;
    if (next == null) return;
    applyPreviewHeight(next);
  }, [applyPreviewHeight]);

  const schedulePreview = useCallback(
    (next: number) => {
      pendingHeightRef.current = next;
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
        const delta = d.startY - e.clientY;
        const finalHeight = clampHeight(
          pendingHeightRef.current ?? d.startH + delta,
        );
        clearPreviewStyles();
        setHeight(finalHeight);
      }

      dragRef.current = null;
      pendingHeightRef.current = null;
      setDragging(false);
      document.body.classList.remove('studio-panel-split-dragging');
    },
    [clampHeight, clearPreviewStyles],
  );

  const onSplitterPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragRef.current = { startY: e.clientY, startH: height };
      pendingHeightRef.current = height;
      setDragging(true);
      document.body.classList.add('studio-panel-split-dragging');
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [height],
  );

  const onSplitterPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.startY - e.clientY;
      const next = clampHeight(dragRef.current.startH + delta);
      schedulePreview(next);
    },
    [clampHeight, schedulePreview],
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Math.round(height)));
    } catch {
      /* ignore */
    }
  }, [height]);

  return {
    containerRef,
    dockShellRef: dockShellRef as RefObject<HTMLDivElement>,
    dockHeight: height,
    dragging,
    splitterProps: {
      onPointerDown: onSplitterPointerDown,
      onPointerMove: onSplitterPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
};
