import { useCallback, useRef, type RefObject } from 'react';
import { useAppStore } from '@/features/project';
import { PreviewToolbar } from '@/features/studio/components/PreviewToolbar';
import { VideoPreviewFrame } from '@/features/studio/components/VideoPreviewFrame';
import { usePreviewDropZone } from '@/features/studio/hooks/usePreviewDropZone';
import { usePreviewViewportZoom } from '@/features/studio/hooks/usePreviewViewportZoom';
import { cn } from '@/lib/cn';

interface VideoViewportProps {
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function VideoViewport({ videoRef }: VideoViewportProps) {
  const videoUrl = useAppStore((s) => s.videoUrl);
  const projectId = useAppStore((s) => s.projectId);
  const videoWidth = useAppStore((s) => s.videoWidth);
  const previewFullscreenOpen = useAppStore((s) => s.previewFullscreenOpen);
  const frameRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const getAnchorEl = useCallback(
    () => wrapRef.current ?? frameRef.current,
    [],
  );

  const { dropActive, dropHint, externalDrag, bindDropZone } = usePreviewDropZone({
    getAnchorEl,
  });

  const viewport = usePreviewViewportZoom({
    frameRef,
    contentRef: wrapRef,
    nativeWidth: videoWidth,
    contentKey: previewFullscreenOpen,
  });

  return (
    <div className="studio-viewport">
      <div className="studio-viewport-stack">
        <div
          ref={frameRef}
          className={cn(
            'studio-viewport-frame',
            dropActive && 'studio-viewport-frame--drop-target',
            !viewport.isAtFit && 'studio-viewport-frame--zoomed',
            viewport.isPanning && 'studio-viewport-frame--panning',
          )}
          {...bindDropZone}
        >
          {previewFullscreenOpen && videoUrl ? (
            <div className="studio-viewport-cinema-placeholder">
              <p className="text-xs text-muted font-medium">Fullscreen preview active</p>
              <p className="text-[10px] text-faint mt-1">Press Esc to exit</p>
            </div>
          ) : (
            <div className="studio-preview-zoom-layer" style={viewport.zoomStyle}>
              <VideoPreviewFrame
                videoRef={videoRef}
                wrapRef={wrapRef}
                dropActive={dropActive}
                dropHint={dropHint}
                externalDrag={externalDrag}
              />
            </div>
          )}
        </div>

        {(videoUrl || projectId) && <PreviewToolbar viewport={viewport} />}
      </div>
    </div>
  );
}
