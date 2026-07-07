import { createContext, useContext, useRef, type ReactNode, type RefObject } from 'react';
import { useAppStore } from '@/features/project';
import {
  usePreviewViewportZoom,
  type PreviewViewportZoom,
} from '@/features/studio/hooks/usePreviewViewportZoom';

interface PreviewViewportContextValue {
  frameRef: RefObject<HTMLDivElement | null>;
  wrapRef: RefObject<HTMLDivElement | null>;
  viewport: PreviewViewportZoom;
}

const PreviewViewportContext = createContext<PreviewViewportContextValue | null>(null);

/** Shares preview frame refs + zoom between the viewport and timeline toolbar. */
export function PreviewViewportProvider({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoWidth = useAppStore((s) => s.videoWidth);
  const previewFullscreenOpen = useAppStore((s) => s.previewFullscreenOpen);

  const viewport = usePreviewViewportZoom({
    frameRef,
    contentRef: wrapRef,
    nativeWidth: videoWidth,
    contentKey: previewFullscreenOpen,
  });

  return (
    <PreviewViewportContext.Provider value={{ frameRef, wrapRef, viewport }}>
      {children}
    </PreviewViewportContext.Provider>
  );
}

export function usePreviewViewportContext(): PreviewViewportContextValue | null {
  return useContext(PreviewViewportContext);
}
