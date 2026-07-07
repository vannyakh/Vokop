import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';

/** OpenCut-style preview zoom bounds (multiplier over "fit"). */
export const PREVIEW_ZOOM = {
  min: 0.25,
  max: 16,
  step: 1.25,
} as const;

/** Percentages relative to the native canvas resolution (100% = actual size). */
export const PREVIEW_ZOOM_PRESETS = [25, 50, 75, 100, 150, 200] as const;

const IS_AT_FIT_EPSILON = 0.001;
const MIDDLE_MOUSE_BUTTON = 1;

interface Size {
  width: number;
  height: number;
}

interface PanSession {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPanX: number;
  startPanY: number;
}

function normalizeWheelDelta(delta: number, deltaMode: number, pageSize: number): number {
  if (deltaMode === WheelEvent.DOM_DELTA_LINE) return delta * 16;
  if (deltaMode === WheelEvent.DOM_DELTA_PAGE) return delta * pageSize;
  return delta;
}

function clampZoom(zoom: number): number {
  return Math.min(PREVIEW_ZOOM.max, Math.max(PREVIEW_ZOOM.min, zoom));
}

function clampPanAxis(pan: number, contentSize: number, viewportSize: number, zoom: number): number {
  const overflow = (contentSize * zoom - viewportSize) / 2;
  if (overflow <= 0) return 0;
  return Math.min(overflow, Math.max(-overflow, pan));
}

function useElementSize(ref: RefObject<HTMLElement | null>, remeasureKey?: unknown): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      setSize({ width: 0, height: 0 });
      return;
    }
    const update = () => {
      setSize({ width: el.offsetWidth, height: el.offsetHeight });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, remeasureKey]);
  return size;
}

export interface PreviewViewportZoom {
  /** Multiplier over the CSS "fit" size (1 = fit to viewport). */
  zoom: number;
  isAtFit: boolean;
  isPanning: boolean;
  /** Percent relative to the video's native resolution (100 = actual size). */
  zoomPercent: number;
  /** Transform style for the zoom layer wrapping the preview frame content. */
  zoomStyle: CSSProperties | undefined;
  fitToScreen: () => void;
  setViewportPercent: (percent: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

/**
 * OpenCut-inspired preview viewport zoom/pan:
 * ⌘/Ctrl + wheel zooms, plain wheel pans while zoomed in,
 * middle-mouse drag pans. Pan is clamped so content never leaves the frame.
 */
export function usePreviewViewportZoom({
  frameRef,
  contentRef,
  nativeWidth,
  contentKey,
}: {
  frameRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
  nativeWidth: number;
  /** Changes when the content element remounts (e.g. fullscreen toggles). */
  contentKey?: unknown;
}): PreviewViewportZoom {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panSessionRef = useRef<PanSession | null>(null);

  const frameSize = useElementSize(frameRef);
  const contentSize = useElementSize(contentRef, contentKey);

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panRef = useRef(pan);
  panRef.current = pan;
  const sizesRef = useRef({ frameSize, contentSize });
  sizesRef.current = { frameSize, contentSize };

  const clampPan = useCallback((next: { x: number; y: number }, nextZoom: number) => {
    const { frameSize: frame, contentSize: content } = sizesRef.current;
    return {
      x: clampPanAxis(next.x, content.width, frame.width, nextZoom),
      y: clampPanAxis(next.y, content.height, frame.height, nextZoom),
    };
  }, []);

  const applyZoom = useCallback(
    (nextZoomRaw: number) => {
      const nextZoom = clampZoom(nextZoomRaw);
      setZoom(nextZoom);
      setPan((prev) =>
        nextZoom <= 1 ? { x: 0, y: 0 } : clampPan(prev, nextZoom),
      );
    },
    [clampPan],
  );

  const fitToScreen = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => applyZoom(zoomRef.current * PREVIEW_ZOOM.step), [applyZoom]);
  const zoomOut = useCallback(() => applyZoom(zoomRef.current / PREVIEW_ZOOM.step), [applyZoom]);

  // fitScale: how many screen px one native px occupies at zoom = 1.
  const fitScale = nativeWidth > 0 && contentSize.width > 0 ? contentSize.width / nativeWidth : 1;

  const setViewportPercent = useCallback(
    (percent: number) => {
      const scale = sizesRef.current.contentSize.width > 0 && nativeWidth > 0
        ? sizesRef.current.contentSize.width / nativeWidth
        : 1;
      applyZoom(percent / 100 / scale);
    },
    [applyZoom, nativeWidth],
  );

  // Wheel: ⌘/Ctrl zooms, plain scroll pans while zoomed in (rAF-batched).
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    let pendingZoomDelta = 0;
    let pendingPanX = 0;
    let pendingPanY = 0;
    let zoomRaf: number | null = null;
    let panRaf: number | null = null;

    const onWheel = (event: WheelEvent) => {
      const deltaX = normalizeWheelDelta(event.deltaX, event.deltaMode, frame.clientWidth);
      const deltaY = normalizeWheelDelta(event.deltaY, event.deltaMode, frame.clientHeight);

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        pendingZoomDelta += deltaY;
        if (zoomRaf === null) {
          zoomRaf = requestAnimationFrame(() => {
            const capped = Math.sign(pendingZoomDelta) * Math.min(Math.abs(pendingZoomDelta), 30);
            applyZoom(zoomRef.current * Math.exp(-capped / 300));
            pendingZoomDelta = 0;
            zoomRaf = null;
          });
        }
        return;
      }

      if (zoomRef.current <= 1 || (deltaX === 0 && deltaY === 0)) return;

      event.preventDefault();
      pendingPanX += deltaX;
      pendingPanY += deltaY;
      if (panRaf === null) {
        panRaf = requestAnimationFrame(() => {
          setPan((prev) =>
            clampPan({ x: prev.x - pendingPanX, y: prev.y - pendingPanY }, zoomRef.current),
          );
          pendingPanX = 0;
          pendingPanY = 0;
          panRaf = null;
        });
      }
    };

    frame.addEventListener('wheel', onWheel, { capture: true, passive: false });
    return () => {
      frame.removeEventListener('wheel', onWheel, { capture: true });
      if (zoomRaf !== null) cancelAnimationFrame(zoomRaf);
      if (panRaf !== null) cancelAnimationFrame(panRaf);
    };
  }, [frameRef, applyZoom, clampPan]);

  // Middle-mouse drag pan.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== MIDDLE_MOUSE_BUTTON || zoomRef.current <= 1) return;
      event.preventDefault();
      panSessionRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanX: panRef.current.x,
        startPanY: panRef.current.y,
      };
      setIsPanning(true);
      frame.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      const session = panSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      event.preventDefault();
      setPan(
        clampPan(
          {
            x: session.startPanX + (event.clientX - session.startClientX),
            y: session.startPanY + (event.clientY - session.startClientY),
          },
          zoomRef.current,
        ),
      );
    };

    const endPan = (event: PointerEvent) => {
      const session = panSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      if (frame.hasPointerCapture(session.pointerId)) {
        frame.releasePointerCapture(session.pointerId);
      }
      panSessionRef.current = null;
      setIsPanning(false);
    };

    frame.addEventListener('pointerdown', onPointerDown);
    frame.addEventListener('pointermove', onPointerMove);
    frame.addEventListener('pointerup', endPan);
    frame.addEventListener('pointercancel', endPan);
    return () => {
      frame.removeEventListener('pointerdown', onPointerDown);
      frame.removeEventListener('pointermove', onPointerMove);
      frame.removeEventListener('pointerup', endPan);
      frame.removeEventListener('pointercancel', endPan);
    };
  }, [frameRef, clampPan]);

  // Re-clamp pan when the frame/content geometry changes.
  useEffect(() => {
    setPan((prev) => clampPan(prev, zoomRef.current));
  }, [frameSize.width, frameSize.height, contentSize.width, contentSize.height, clampPan]);

  const isAtFit = Math.abs(zoom - 1) < IS_AT_FIT_EPSILON;

  const zoomStyle = useMemo<CSSProperties | undefined>(() => {
    if (isAtFit && pan.x === 0 && pan.y === 0) return undefined;
    return {
      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
      transformOrigin: 'center center',
    };
  }, [isAtFit, pan.x, pan.y, zoom]);

  return {
    zoom,
    isAtFit,
    isPanning,
    zoomPercent: Math.round(zoom * fitScale * 100),
    zoomStyle,
    fitToScreen,
    setViewportPercent,
    zoomIn,
    zoomOut,
  };
}
