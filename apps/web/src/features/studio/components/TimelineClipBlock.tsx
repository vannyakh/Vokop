import { memo, useMemo } from 'react';
import { GripHorizontal, VolumeX } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { TimelineClipModel, TimelineTrackModel } from '@/features/studio/lib/timelineTypes';

interface TimelineClipBlockProps {
  clip: TimelineClipModel;
  track: TimelineTrackModel;
  left: number;
  width: number;
  height: number;
  selected: boolean;
  filmstripThumbs?: string[];
  thumbWidth?: number;
  children?: React.ReactNode;
  onSelect: (e?: React.MouseEvent) => void;
  onDragStart: (e: React.PointerEvent, mode: 'move' | 'left' | 'right') => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  /** Split/drag unlocks after transcript is ready. */
  canDrag?: boolean;
  /** Track-level mute — shown as an icon on the waveform strip, footage stays at full brightness. */
  muted?: boolean;
  /** Live drag/resize preview — skips expensive child redraw churn. */
  interacting?: boolean;
}

/** Determine the CapCut-style variant for coloring */
function getClipVariant(
  clip: TimelineClipModel,
  trackType: TimelineTrackModel['type'],
): string {
  if (clip.canvasKind === 'template') return 'template';
  if (clip.canvasKind === 'logo') return 'logo';
  if (clip.canvasKind === 'sticker') return 'sticker';
  if (clip.canvasKind === 'image') return 'image';
  if (clip.segmentType === 'translation') return 'translation';
  if (clip.segmentType === 'transcript') return 'transcript';
  return trackType;
}

export const TimelineClipBlock = memo(function TimelineClipBlock({
  clip,
  track,
  left,
  width,
  height,
  selected,
  filmstripThumbs,
  thumbWidth,
  children,
  onSelect,
  onDragStart,
  onContextMenu,
  canDrag = true,
  muted = false,
  interacting = false,
}: TimelineClipBlockProps) {
  const isEditableTrack =
    track.type === 'text' ||
    track.type === 'image' ||
    track.type === 'sticker' ||
    track.type === 'effect' ||
    track.type === 'overlay' ||
    track.type === 'sound' ||
    clip.mediaKind === 'video' ||
    clip.mediaKind === 'audio';
  const canEdit = canDrag && isEditableTrack;
  const isFootage = track.type === 'video';
  const isAudio = track.type === 'audio' || track.type === 'sound';
  const variant = getClipVariant(clip, track.type);

  const displayLabel = useMemo(() => {
    if (clip.voiceFilter && clip.voiceFilter !== 'original' && clip.voiceFilter !== 'none') {
      const filterName = clip.voiceFilter.charAt(0).toUpperCase() + clip.voiceFilter.slice(1);
      return `${clip.name} Voice filters ${filterName}`;
    }
    return clip.name;
  }, [clip.name, clip.voiceFilter]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect(e as unknown as React.MouseEvent);
    if (canEdit) onDragStart(e, 'move');
  };

  return (
    <div
      className={cn(
        'studio-timeline-clip-block',
        `studio-timeline-clip-block--${track.type}`,
        `studio-timeline-clip-variant--${variant}`,
        selected && 'is-selected',
        isFootage && 'studio-timeline-clip-block--footage',
        canEdit && 'studio-timeline-clip-block--editable',
        interacting && 'studio-timeline-clip-block--interacting',
      )}
      style={{ left, width, height }}
      onPointerDown={handlePointerDown}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
        onContextMenu?.(e);
      }}
    >
      {/* Filmstrip for video */}
      {isFootage && filmstripThumbs && filmstripThumbs.length > 0 && (
        <div className="studio-timeline-clip-filmstrip">
          {filmstripThumbs.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="studio-timeline-filmstrip-thumb"
              draggable={false}
            />
          ))}
        </div>
      )}

      {/* Embedded soundtrack — dark strip docked to the bottom of the footage clip */}
      {isFootage && children && (
        <div
          className={cn('studio-timeline-clip-footage-wave', muted && 'is-muted')}
          aria-hidden
        >
          {children}
          {muted && (
            <span className="studio-timeline-clip-footage-mute" title="Track muted">
              <VolumeX size={10} />
            </span>
          )}
        </div>
      )}

      {/* Audio waveform */}
      {isAudio && children}

      {/* EA-style keyframe diamonds */}
      {(clip.keyframes ?? []).map((kf) => {
        const pct = clip.duration > 0 ? (kf.offset / clip.duration) * 100 : 0;
        return (
          <span
            key={kf.id}
            className="studio-timeline-clip-keyframe"
            style={{ left: `${Math.min(100, Math.max(0, pct))}%` }}
            title="Keyframe"
          />
        );
      })}

      {/* Clip label — overlay on audio/sound so waveform stays visible */}
      {isEditableTrack && (
        <div
          className={cn(
            'studio-timeline-clip-inner',
            isAudio && 'studio-timeline-clip-inner--audio',
          )}
        >
          {width > 50 && (
            <span className="studio-timeline-clip-label">{displayLabel}</span>
          )}
        </div>
      )}

      {/* Video footage label */}
      {isFootage && selected && (
        <div className="studio-timeline-clip-footage-label">
          <span>{displayLabel}</span>
        </div>
      )}

      {/* Drag grip indicator for selected editable clips */}
      {selected && canEdit && width > 48 && (
        <div className="studio-timeline-clip-grip" aria-hidden>
          <GripHorizontal size={10} />
        </div>
      )}

      {/* Resize handles */}
      {canEdit && (
        <>
          <div
            className="studio-timeline-clip-handle studio-timeline-clip-handle--left"
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect();
              onDragStart(e, 'left');
            }}
          />
          <div
            className="studio-timeline-clip-handle studio-timeline-clip-handle--right"
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect();
              onDragStart(e, 'right');
            }}
          />        </>
      )}
    </div>
  );
});
