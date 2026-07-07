import { useCallback, useRef, type RefObject } from 'react';
import { useAppStore } from '@/features/project';
import { VideoPreviewFrame } from '@/features/studio/components/VideoPreviewFrame';
import { usePreviewDropZone } from '@/features/studio/hooks/usePreviewDropZone';
import { usePreviewViewportContext } from '@/features/studio/context/PreviewViewportContext';
import { cn } from '@/lib/cn';

interface VideoViewportProps {
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function VideoViewport({ videoRef }: VideoViewportProps) {
  const videoUrl = useAppStore((s) => s.videoUrl);
  const previewFullscreenOpen = useAppStore((s) => s.previewFullscreenOpen);
  const previewCtx = usePreviewViewportContext();
  const frameRef = previewCtx?.frameRef;
  const wrapRef = previewCtx?.wrapRef;
  const viewport = previewCtx?.viewport;
  const fallbackFrameRef = useRef<HTMLDivElement>(null);
  const fallbackWrapRef = useRef<HTMLDivElement>(null);

  const getAnchorEl = useCallback(
    () => (wrapRef ?? fallbackWrapRef).current ?? (frameRef ?? fallbackFrameRef).current,
    [frameRef, wrapRef],
  );

  const { dropActive, dropHint, externalDrag, bindDropZone } = usePreviewDropZone({
    getAnchorEl,
  });

  const resolvedFrameRef = frameRef ?? fallbackFrameRef;
  const resolvedWrapRef = wrapRef ?? fallbackWrapRef;

  return (
    <div className="studio-viewport">
      <div className="studio-viewport-stack studio-viewport-stack--no-toolbar">
        <div
          ref={resolvedFrameRef}
          className={cn(
            'studio-viewport-frame',
            dropActive && 'studio-viewport-frame--drop-target',
            viewport && !viewport.isAtFit && 'studio-viewport-frame--zoomed',
            viewport?.isPanning && 'studio-viewport-frame--panning',
          )}
          {...bindDropZone}
        >
          {previewFullscreenOpen && videoUrl ? (
            <div className="studio-viewport-cinema-placeholder">
              <p className="text-xs text-muted font-medium">Fullscreen preview active</p>
              <p className="text-[10px] text-faint mt-1">Press Esc to exit</p>
            </div>
          ) : (
            <div className="studio-preview-zoom-layer" style={viewport?.zoomStyle}>
              <VideoPreviewFrame
                videoRef={videoRef}
                wrapRef={resolvedWrapRef}
                dropActive={dropActive}
                dropHint={dropHint}
                externalDrag={externalDrag}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
