import { useCallback, useRef, type RefObject } from 'react';
import { Play, Pause, Minimize2 } from 'lucide-react';
import { useAppStore } from '@/features/project';
import { formatStudioTimecode } from '@/features/studio/lib/timelineUtils';
import { useVideoPlaybackState } from '@/features/studio/hooks/useVideoPlaybackState';

interface CinemaPreviewControlsProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  onExit: () => void;
}

export function CinemaPreviewControls({ onExit }: CinemaPreviewControlsProps) {
  const currentTime = useAppStore((s) => s.currentTime);
  const duration = useAppStore((s) => s.duration);
  const scrubRef = useRef<HTMLInputElement>(null);
  const { isPaused, togglePlay, seek } = useVideoPlaybackState();

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const onScrub = useCallback(
    (value: number) => {
      seek(value);
    },
    [seek],
  );

  return (
    <div className="studio-cinema-controls">
      <div className="studio-cinema-controls-inner">
        <button
          type="button"
          onClick={togglePlay}
          className="studio-cinema-play"
          title={isPaused ? 'Play' : 'Pause'}
          aria-label={isPaused ? 'Play' : 'Pause'}
        >
          {isPaused ? (
            <Play size={14} fill="currentColor" className="ml-0.5" />
          ) : (
            <Pause size={14} />
          )}
        </button>

        <span className="studio-cinema-time font-mono">
          <span className="studio-cinema-time-current">{formatStudioTimecode(currentTime)}</span>
          <span className="studio-cinema-time-sep">|</span>
          <span className="studio-cinema-time-total">{formatStudioTimecode(duration)}</span>
        </span>

        <div className="studio-cinema-scrub">
          <div className="studio-cinema-scrub-track" aria-hidden>
            <div className="studio-cinema-scrub-fill" style={{ width: `${progress}%` }} />
            <div className="studio-cinema-scrub-knob" style={{ left: `${progress}%` }} />
          </div>
          <input
            ref={scrubRef}
            type="range"
            min={0}
            max={duration || 0}
            step={0.04}
            value={currentTime}
            onChange={(e) => onScrub(parseFloat(e.target.value))}
            className="studio-cinema-scrub-input"
            aria-label="Seek"
          />
        </div>

        <button
          type="button"
          onClick={onExit}
          className="studio-cinema-exit"
          title="Exit fullscreen preview"
          aria-label="Exit fullscreen preview"
        >
          <Minimize2 size={16} />
        </button>
      </div>
    </div>
  );
}
