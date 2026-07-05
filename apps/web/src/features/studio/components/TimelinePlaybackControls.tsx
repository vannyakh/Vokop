import type { RefObject } from 'react';
import { StudioIcon } from '@vokop/ui';
import { useAudioVisualizer } from '@/features/audio';
import type { VideoAudioGraph } from '@/features/audio/hooks/useAudioEngine';
import { formatStudioTimecode } from '@/features/studio/lib/timelineUtils';

interface TimelinePlaybackControlsProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  connectVideoAudioGraph: (video: HTMLVideoElement) => Promise<VideoAudioGraph>;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
}

/** Center transport: play/pause + timecode + live audio level meter. */
export function TimelinePlaybackControls({
  videoRef,
  connectVideoAudioGraph,
  isPaused,
  currentTime,
  duration,
  onTogglePlay,
}: TimelinePlaybackControlsProps) {
  const levels = useAudioVisualizer(videoRef, connectVideoAudioGraph, !isPaused);

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

      {/* Live audio level meter — bar heights track a real AnalyserNode reading. */}
      <div
        className={`studio-playback-audio-meter ${!isPaused ? 'is-playing' : ''}`}
        title="Live audio levels"
      >
        {levels.map((level, i) => (
          <span
            key={i}
            className="studio-playback-audio-bar"
            style={{ transform: `scaleY(${Math.max(0.08, level)})` }}
          />
        ))}
      </div>
    </div>
  );
}
