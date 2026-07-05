import { Sparkles, Loader2, Copy } from 'lucide-react';
import { Button, StudioIcon } from '@vokop/ui';
import { TimelineToolButton } from '@/features/studio/components/TimelineToolButton';

interface TimelineEditingToolsProps {
  canSplit: boolean;
  canDelete: boolean;
  canDuplicate?: boolean;
  processBusy: boolean;
  onSplit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onProcessAll: () => void;
}

/** Left toolbar cluster: razor / delete / duplicate + Process All. */
export function TimelineEditingTools({
  canSplit,
  canDelete,
  canDuplicate = false,
  processBusy,
  onSplit,
  onDelete,
  onDuplicate,
  onProcessAll,
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

      <Button
        size="md"
        onClick={onProcessAll}
        disabled={processBusy}
        className="studio-playback-process"
        title="Process all AI steps"
      >
        {processBusy ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Sparkles size={14} />
        )}
        <span className="studio-playback-process-label">Process All</span>
      </Button>
    </div>
  );
}
