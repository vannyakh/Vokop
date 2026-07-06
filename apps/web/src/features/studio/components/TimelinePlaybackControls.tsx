import type { RefObject, CSSProperties } from 'react';
import { StudioIcon } from '@vokop/ui';
import {
  PLAYBACK_CLIP_VOLUME,
  PLAYBACK_HIGH_VOLUME,
  type AudioVisualizerReadout,
} from '@/features/audio/hooks/useAudioVisualizer';
import type { VideoAudioGraph } from '@/features/audio/hooks/useAudioEngine';
import { formatStudioTimecode } from '@/features/studio/lib/timelineUtils';
import { cn } from '@/lib/cn';

interface TimelinePlaybackControlsProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  connectVideoAudioGraph: (video: HTMLVideoElement) => Promise<VideoAudioGraph>;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  audioReadout: AudioVisualizerReadout;
}

/** Center transport: play/pause + timecode + live audio level meter. */
export function TimelinePlaybackControls({
  isPaused,
  currentTime,
  duration,
  onTogglePlay,
  audioReadout,
}: TimelinePlaybackControlsProps) {
  const { levels, peakLevel, isHighVolume, isClipping } = audioReadout;
  const peakPct = Math.round(peakLevel * 100);

  return (
    <div className="studio-playback-center" aria-label="Playback">
      <button
        type="button"
        onClick={onTogglePlay}
        className={cn(
          'studio-playback-play',
          !isPaused && 'is-playing',
          isHighVolume && 'is-loud',
          isClipping && 'is-clipping',
        )}
        title={isPaused ? 'Play' : 'Pause'}
      >
        {isPaused ? (
          <StudioIcon name="play" size={15} className="ml-0.5" />
        ) : (
          <StudioIcon name="pause" size={15} />
        )}
      </button>
      <span className="studio-playback-time font-mono">
        <span
          className={cn(
            'studio-playback-time-current',
            isHighVolume && 'is-loud',
            isClipping && 'is-clipping',
          )}
        >
          {formatStudioTimecode(currentTime)}
        </span>
        <span className="studio-playback-time-sep">|</span>
        <span className="studio-playback-time-total">
          {formatStudioTimecode(duration)}
        </span>
      </span>

      <div
        className={cn(
          'studio-playback-audio-meter',
          !isPaused && 'is-playing',
          isHighVolume && 'is-high-volume',
          isClipping && 'is-clipping',
        )}
        title={
          isClipping
            ? `Clipping detected (${peakPct}%)`
            : isHighVolume
              ? `High volume (${peakPct}%)`
              : `Live audio (${peakPct}%)`
        }
        aria-hidden
      >
        {levels.map((level, i) => {
          const barHot = level >= PLAYBACK_HIGH_VOLUME;
          const barClip = level >= PLAYBACK_CLIP_VOLUME;
          const barPct = Math.round(Math.max(14, Math.min(100, level * 100)));
          return (
            <span
              key={i}
              className={cn(
                'studio-playback-audio-bar',
                barClip && 'is-clipping',
                barHot && !barClip && 'is-hot',
              )}
              style={{ '--bar-level': `${barPct}%` } as CSSProperties}
            />
          );
        })}
      </div>
    </div>
  );
}
