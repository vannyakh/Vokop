import { ImagePlus, Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ProjectCoverChipProps {
  coverUrl: string | null;
  onEdit: () => void;
}

/** Compact cover control — lives in the track header column footer, not on the timeline. */
export function ProjectCoverChip({ coverUrl, onEdit }: ProjectCoverChipProps) {
  return (
    <button
      type="button"
      className={cn('studio-cover-chip', coverUrl && 'has-cover')}
      title={coverUrl ? 'Edit cover' : 'Add cover'}
      onClick={onEdit}
    >
      <span className="studio-cover-chip-thumb" aria-hidden>
        {coverUrl ? (
          <img src={coverUrl} alt="" className="studio-cover-chip-img" draggable={false} />
        ) : (
          <ImagePlus size={14} />
        )}
      </span>
      <span className="studio-cover-chip-meta">
        <span className="studio-cover-chip-label">{coverUrl ? 'Cover' : 'Add cover'}</span>
        <span className="studio-cover-chip-hint">
          {coverUrl ? 'Project thumbnail' : 'Pick frame or upload'}
        </span>
      </span>
      <span className="studio-cover-chip-edit" aria-hidden>
        <Pencil size={12} />
      </span>
    </button>
  );
}
