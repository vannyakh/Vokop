import { Sparkles, Loader2 } from 'lucide-react';
import { Button, StudioIcon } from '@vokop/ui';
import { TimelineToolButton } from '@/features/studio/components/TimelineToolButton';

interface TimelineEditingToolsProps {
  canSplit: boolean;
  canDelete: boolean;
  processBusy: boolean;
  onSplit: () => void;
  onDelete: () => void;
  onProcessAll: () => void;
}

/** Left toolbar cluster: clip edit actions + Process All. */
export function TimelineEditingTools({
  canSplit,
  canDelete,
  processBusy,
  onSplit,
  onDelete,
  onProcessAll,
}: TimelineEditingToolsProps) {
  return (
    <div className="studio-playback-cluster studio-playback-cluster--edit" aria-label="Editing tools">
      <div className="studio-playback-tool-group">
        <TimelineToolButton
          title={canSplit ? 'Split at playhead' : 'Split unlocks after transcript is ready'}
          disabled={!canSplit}
          onClick={onSplit}
        >
          <StudioIcon name="scissors" size={15} />
        </TimelineToolButton>
        <TimelineToolButton
          title="Delete selected clip"
          disabled={!canDelete}
          onClick={onDelete}
        >
          <StudioIcon name="bin" size={15} />
        </TimelineToolButton>
      </div>

      <Button
        size="md"
        onClick={onProcessAll}
        disabled={processBusy}
        className="studio-playback-process"
      >
        {processBusy ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Sparkles size={14} />
        )}
        Process All
      </Button>
    </div>
  );
}
