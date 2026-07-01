import { X } from 'lucide-react';
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
  onSelect: () => void;
  onDelete?: () => void;
  onDragStart: (e: React.PointerEvent, mode: 'move' | 'left' | 'right') => void;
  onContextMenu?: (e: React.MouseEvent) => void;
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
}: TimelineClipBlockProps) {
  const canEdit = track.type === 'text' || track.type === 'overlay';
  const isCanvasAsset = clip.canvasKind === 'logo' || clip.canvasKind === 'image';
  const isFootage = track.type === 'video';

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    if (canEdit) onDragStart(e, 'move');
  };

  return (
    <div
      className={cn(
        'studio-timeline-clip-block',
        `studio-timeline-clip-block--${track.type}`,
        selected && 'is-selected',
        isFootage && 'studio-timeline-clip-block--footage',
      )}
      style={{ left, width, height }}
      onPointerDown={handlePointerDown}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
        onContextMenu?.(e);
      }}
    >
      {track.type === 'video' && filmstripThumbs && filmstripThumbs.length > 0 ? (
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
      ) : track.type === 'audio' ? (
        children
      ) : (
        <div
          className={cn(
            'studio-timeline-clip-label-wrap',
            isCanvasAsset && `studio-timeline-clip-label-wrap--${clip.canvasKind}`,
          )}
        >
          <span className="studio-timeline-clip-label">{clip.name}</span>
        </div>
      )}

      {isFootage && selected && (
        <div className="studio-timeline-clip-footage-label">
          <span>{clip.name}</span>
        </div>
      )}

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
          <X size={10} />
        </button>
      )}

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
          />
        </>
      )}
    </div>
  );
}
