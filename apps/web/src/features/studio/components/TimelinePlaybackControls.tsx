import { StudioIcon } from '@vokop/ui';
import { formatStudioTimecode } from '@/features/studio/lib/timelineUtils';

interface TimelinePlaybackControlsProps {
  isPaused: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
}

/** Center transport: play/pause + timecode. */
export function TimelinePlaybackControls({
  isPaused,
  currentTime,
  duration,
  onTogglePlay,
}: TimelinePlaybackControlsProps) {
  return (
    <div className="studio-playback-center" aria-label="Playback">
      <button
        type="button"
        onClick={onTogglePlay}
        className="studio-playback-play"
        title={isPaused ? 'Play' : 'Pause'}
      >
        {isPaused ? (
          <StudioIcon name="play" size={13} className="ml-0.5" />
        ) : (
          <StudioIcon name="pause" size={13} />
        )}
      </button>
      <span className="studio-playback-time font-mono">
        <span className="studio-playback-time-current">
          {formatStudioTimecode(currentTime)}
        </span>
        <span className="studio-playback-time-sep">|</span>
        <span className="studio-playback-time-total">
          {formatStudioTimecode(duration)}
        </span>
      </span>
    </div>
  );
}
