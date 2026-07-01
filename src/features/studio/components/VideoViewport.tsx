import type { RefObject } from 'react';
import { useAppStore } from '@/features/project';
import { VideoPreviewFrame } from '@/features/studio/components/VideoPreviewFrame';

interface VideoViewportProps {
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function VideoViewport({ videoRef }: VideoViewportProps) {
  const videoUrl = useAppStore((s) => s.videoUrl);
  const previewFullscreenOpen = useAppStore((s) => s.previewFullscreenOpen);

  if (!videoUrl) return null;

  return (
    <div className="studio-viewport">
      <div className="studio-viewport-frame">
        {previewFullscreenOpen ? (
          <div className="studio-viewport-cinema-placeholder">
            <p className="text-xs text-muted font-medium">Fullscreen preview active</p>
            <p className="text-[10px] text-faint mt-1">Press Esc to exit</p>
          </div>
        ) : (
          <VideoPreviewFrame videoRef={videoRef} />
        )}
      </div>
    </div>
  );
}
