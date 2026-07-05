import { useCallback, useRef, type RefObject } from 'react';
import { useAppStore } from '@/features/project';
import { VideoPreviewFrame } from '@/features/studio/components/VideoPreviewFrame';
import { usePreviewDropZone } from '@/features/studio/hooks/usePreviewDropZone';
import { cn } from '@/lib/cn';

interface VideoViewportProps {
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function VideoViewport({ videoRef }: VideoViewportProps) {
  const videoUrl = useAppStore((s) => s.videoUrl);
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

  return (
    <div className="studio-viewport">
      <div
        ref={frameRef}
        className={cn(
          'studio-viewport-frame',
          dropActive && 'studio-viewport-frame--drop-target',
        )}
        {...bindDropZone}
      >
        {previewFullscreenOpen && videoUrl ? (
          <div className="studio-viewport-cinema-placeholder">
            <p className="text-xs text-muted font-medium">Fullscreen preview active</p>
            <p className="text-[10px] text-faint mt-1">Press Esc to exit</p>
          </div>
        ) : (
          <VideoPreviewFrame
            videoRef={videoRef}
            wrapRef={wrapRef}
            dropActive={dropActive}
            dropHint={dropHint}
            externalDrag={externalDrag}
          />
        )}
      </div>
    </div>
  );
}
