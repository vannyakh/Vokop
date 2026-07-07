import type { CSSProperties } from 'react';
import { StudioIcon } from '@vokop/ui';
import { useAppStore } from '@/features/project';
import {
  PLAYBACK_CLIP_VOLUME,
  PLAYBACK_HIGH_VOLUME,
  type AudioVisualizerReadout,
} from '@/features/audio/hooks/useAudioVisualizer';
import {
  EditableFrameTimecode,
  PreviewFrameStepButtons,
} from '@/features/studio/components/PreviewToolbar';
import { FRAME_STEP_SEC } from '@/features/studio/lib/shortcutKeys';
import { cn } from '@/lib/cn';

interface TimelinePlaybackControlsProps {
  isPaused: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  audioReadout: AudioVisualizerReadout;
}

/** Center transport: frame timecode, step, play/pause, audio meter. */
export function TimelinePlaybackControls({
  isPaused,
  currentTime,
  duration,
  onTogglePlay,
  audioReadout,
}: TimelinePlaybackControlsProps) {
  const seekTimeline = useAppStore((s) => s.seekTimeline);
  const { levels, peakLevel, isHighVolume, isClipping } = audioReadout;
  const peakPct = Math.round(peakLevel * 100);

  const stepFrame = (direction: -1 | 1) => {
    seekTimeline(currentTime + direction * FRAME_STEP_SEC);
  };

  return (
    <div className="studio-playback-center" aria-label="Playback">
      <EditableFrameTimecode
        currentTime={currentTime}
        duration={duration}
        onSeek={seekTimeline}
        className="studio-preview-timecode studio-playback-timecode font-mono"
      />

      <div className="studio-playback-transport">
        <PreviewFrameStepButtons onStep={stepFrame} />
        <button
          type="button"
          onClick={onTogglePlay}
          className={cn(
            'studio-playback-play',
            !isPaused && 'is-playing',
            isHighVolume && 'is-loud',
            isClipping && 'is-clipping',
          )}
          title={isPaused ? 'Play (Space)' : 'Pause (Space)'}
        >
          {isPaused ? (
            <StudioIcon name="play" size={15} className="ml-0.5" />
          ) : (
            <StudioIcon name="pause" size={15} />
          )}
        </button>
      </div>

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
