import { X, GripHorizontal } from 'lucide-react';
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
  onDelete?: () => void;
  onDragStart: (e: React.PointerEvent, mode: 'move' | 'left' | 'right') => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  /** Split/drag unlocks after transcript is ready. */
  canDrag?: boolean;
}

/** Determine the CapCut-style variant for coloring */
function getClipVariant(
  clip: TimelineClipModel,
  trackType: TimelineTrackModel['type'],
): string {
  if (clip.canvasKind === 'template') return 'template';
  if (clip.canvasKind === 'logo') return 'logo';
  if (clip.canvasKind === 'image') return 'image';
  if (clip.segmentType === 'translation') return 'translation';
  if (clip.segmentType === 'transcript') return 'transcript';
  return trackType;
}

export function TimelineClipBlock({
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
  onDelete,
  onDragStart,
  onContextMenu,
  canDrag = true,
}: TimelineClipBlockProps) {
  const isEditableTrack =
    track.type === 'text' ||
    track.type === 'overlay' ||
    clip.mediaKind === 'video' ||
    clip.mediaKind === 'audio';
  const canEdit = canDrag && isEditableTrack;
  const isFootage = track.type === 'video';
  const isAudio = track.type === 'audio';
  const variant = getClipVariant(clip, track.type);

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
      )}
      style={{ left, width, height }}
      onPointerDown={handlePointerDown}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
        onContextMenu?.(e);
      }}    >
      {/* Filmstrip for video */}
      {isFootage && filmstripThumbs && filmstripThumbs.length > 0 && (
        <div className="studio-timeline-clip-filmstrip">
          {filmstripThumbs.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="studio-timeline-filmstrip-thumb"
              style={{ width: thumbWidth }}
              draggable={false}
            />
          ))}
        </div>
      )}

      {/* Audio waveform */}
      {isAudio && children}

      {/* Clip label */}
      {isEditableTrack && (
        <div className="studio-timeline-clip-inner">
          {width > 50 && (
            <span className="studio-timeline-clip-label">{clip.name}</span>
          )}
        </div>
      )}

      {/* Video footage label */}
      {isFootage && selected && (
        <div className="studio-timeline-clip-footage-label">
          <span>{clip.name}</span>
        </div>
      )}

      {/* Delete button */}
      {selected && canEdit && onDelete && (
        <button
          type="button"
          className="studio-timeline-clip-delete"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete clip"
        >
          <X size={9} />
        </button>
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
}
