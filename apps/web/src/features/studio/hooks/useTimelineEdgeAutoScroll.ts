import { useEffect, useRef } from 'react';

interface UseTimelineEdgeAutoScrollParams {
  isActive: boolean;
  getMouseClientX: () => number;
  rulerScrollRef: React.RefObject<HTMLDivElement | null>;
  tracksScrollRef: React.RefObject<HTMLDivElement | null>;
  contentWidth: number;
  edgeThreshold?: number;
  maxScrollSpeed?: number;
}

/** Auto-scroll timeline when dragging clips near viewport edges (OpenCut sample). */
export function useTimelineEdgeAutoScroll({
  isActive,
  getMouseClientX,
  rulerScrollRef,
  tracksScrollRef,
  contentWidth,
  edgeThreshold = 100,
  maxScrollSpeed = 15,
}: UseTimelineEdgeAutoScrollParams): void {
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    const step = () => {
      const rulerViewport = rulerScrollRef.current;
      const tracksViewport = tracksScrollRef.current;
      if (!rulerViewport || !tracksViewport) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      const viewportRect = rulerViewport.getBoundingClientRect();
      const mouseXRelative = getMouseClientX() - viewportRect.left;
      const viewportWidth = rulerViewport.clientWidth;
      const scrollMax = Math.max(0, Math.max(contentWidth, rulerViewport.scrollWidth) - viewportWidth);

      let scrollSpeed = 0;
      if (mouseXRelative < edgeThreshold && rulerViewport.scrollLeft > 0) {
        scrollSpeed = -maxScrollSpeed * (1 - Math.max(0, mouseXRelative) / edgeThreshold);
      } else if (mouseXRelative > viewportWidth - edgeThreshold && rulerViewport.scrollLeft < scrollMax) {
        scrollSpeed =
          maxScrollSpeed *
          (1 - Math.max(0, viewportWidth - mouseXRelative) / edgeThreshold);
      }

      if (scrollSpeed !== 0) {
        const next = Math.max(0, Math.min(scrollMax, rulerViewport.scrollLeft + scrollSpeed));
        rulerViewport.scrollLeft = next;
        tracksViewport.scrollLeft = next;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [
    isActive,
    getMouseClientX,
    rulerScrollRef,
    tracksScrollRef,
    contentWidth,
    edgeThreshold,
    maxScrollSpeed,
  ]);
}
