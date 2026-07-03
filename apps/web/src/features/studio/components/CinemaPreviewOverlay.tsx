import { useEffect, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/features/project';
import { VideoPreviewFrame } from '@/features/studio/components/VideoPreviewFrame';
import { CinemaPreviewControls } from '@/features/studio/components/CinemaPreviewControls';
import { useVideoPlaybackState } from '@/features/studio/hooks/useVideoPlaybackState';

interface CinemaPreviewOverlayProps {
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function CinemaPreviewOverlay({ videoRef }: CinemaPreviewOverlayProps) {
  const videoUrl = useAppStore((s) => s.videoUrl);
  const previewFullscreenOpen = useAppStore((s) => s.previewFullscreenOpen);
  const setPreviewFullscreenOpen = useAppStore((s) => s.setPreviewFullscreenOpen);
  const { togglePlay } = useVideoPlaybackState();

  useEffect(() => {
    if (!previewFullscreenOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewFullscreenOpen(false);
        return;
      }
      if (e.key === ' ' && !(e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [previewFullscreenOpen, setPreviewFullscreenOpen, togglePlay]);

  if (!previewFullscreenOpen || !videoUrl) return null;

  return createPortal(
    <div className="studio-cinema-overlay" role="dialog" aria-modal="true" aria-label="Fullscreen preview">
      <div className="studio-cinema-stage">
        <VideoPreviewFrame videoRef={videoRef} cinema onTogglePlay={togglePlay} />
      </div>
      <CinemaPreviewControls
        videoRef={videoRef}
        onExit={() => setPreviewFullscreenOpen(false)}
      />
    </div>,
    document.body,
  );
}
