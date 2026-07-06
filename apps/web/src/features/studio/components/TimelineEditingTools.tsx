import { Copy } from 'lucide-react';
import { StudioIcon } from '@vokop/ui';
import { TimelineToolButton } from '@/features/studio/components/TimelineToolButton';

interface TimelineEditingToolsProps {
  canSplit: boolean;
  canDelete: boolean;
  canDuplicate?: boolean;
  onSplit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}

/** Left toolbar cluster: razor / delete / duplicate. */
export function TimelineEditingTools({
  canSplit,
  canDelete,
  canDuplicate = false,
  onSplit,
  onDelete,
  onDuplicate,
}: TimelineEditingToolsProps) {
  return (
    <div className="studio-playback-cluster studio-playback-cluster--edit" aria-label="Editing tools">
      <div className="studio-playback-tool-group">
        <TimelineToolButton
          title={
            canSplit
              ? 'Split at playhead (B) — cuts footage and clips under the playhead'
              : 'Move playhead over a clip to split'
          }
          disabled={!canSplit}
          onClick={onSplit}
          active={canSplit}
          className={canSplit ? 'is-ready' : undefined}
        >
          <StudioIcon name="scissors" size={15} />
        </TimelineToolButton>
        <TimelineToolButton
          title={canDelete ? 'Delete selected clip (⌫)' : 'Select a clip to delete'}
          disabled={!canDelete}
          onClick={onDelete}
        >
          <StudioIcon name="bin" size={15} />
        </TimelineToolButton>
        {onDuplicate && (
          <TimelineToolButton
            title={canDuplicate ? 'Duplicate selection (⌘D)' : 'Select a clip to duplicate'}
            disabled={!canDuplicate}
            onClick={onDuplicate}
          >
            <Copy size={15} strokeWidth={2} />
          </TimelineToolButton>
        )}
      </div>
    </div>
  );
}
