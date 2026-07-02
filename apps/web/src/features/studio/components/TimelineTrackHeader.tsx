import { Film, Type, Layers, Mic2, Volume2, VolumeX, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { TimelineTrackModel, TimelineTrackType } from '@/features/studio/lib/timelineTypes';

interface TimelineTrackHeaderProps {
  track: TimelineTrackModel;
  height: number;
  muted: boolean;
  onToggleMute: () => void;
  onAddClip: () => void;
}

const TRACK_ICONS: Record<TimelineTrackType, typeof Film> = {
  video: Film,
  text: Type,
  overlay: Layers,
  audio: Mic2,
};

export function TimelineTrackHeader({
  track,
  height,
  muted,
  onToggleMute,
  onAddClip,
}: TimelineTrackHeaderProps) {
  const Icon = TRACK_ICONS[track.type];
  const canAdd = track.type === 'text' || track.type === 'overlay';

  return (
    <div className="studio-track-header" style={{ height }} data-track={track.type}>
      <span className={cn('studio-track-header-icon', `studio-track-header-icon--${track.type}`)}>
        <Icon size={13} strokeWidth={2} />
      </span>
      <span className="studio-track-header-label" title={track.label}>
        {track.label}
      </span>
      <button
        type="button"
        className="studio-track-header-btn"
        title={muted ? `Unmute ${track.label}` : `Mute ${track.label}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleMute();
        }}
      >
        {muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
      </button>
      {canAdd && (
        <button
          type="button"
          className="studio-track-header-btn"
          title={`Add clip to ${track.label}`}
          onClick={(e) => {
            e.stopPropagation();
            onAddClip();
          }}
        >
          <Plus size={11} />
        </button>
      )}
    </div>
  );
}
