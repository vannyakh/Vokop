import {
  ArrowLeftToLine,
  ArrowRightToLine,
  Bookmark,
  Copy,
  Unlink,
} from 'lucide-react';
import { StudioIcon } from '@vokop/ui';
import { TimelineToolButton } from '@/features/studio/components/TimelineToolButton';

interface TimelineEditingToolsProps {
  canSplit: boolean;
  canDelete: boolean;
  canDuplicate?: boolean;
  canSeparateAudio?: boolean;
  isBookmarked?: boolean;
  onSplit: () => void;
  onSplitRemoveLeft?: () => void;
  onSplitRemoveRight?: () => void;
  onSeparateAudio?: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onToggleBookmark?: () => void;
}

/** Left toolbar cluster (OpenCut-style): razor / trim / audio / duplicate / delete / bookmark. */
export function TimelineEditingTools({
  canSplit,
  canDelete,
  canDuplicate = false,
  canSeparateAudio = false,
  isBookmarked = false,
  onSplit,
  onSplitRemoveLeft,
  onSplitRemoveRight,
  onSeparateAudio,
  onDelete,
  onDuplicate,
  onToggleBookmark,
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
        {onSplitRemoveLeft && (
          <TimelineToolButton
            title={canSplit ? 'Split and remove left (Q)' : 'Move playhead over a clip'}
            disabled={!canSplit}
            onClick={onSplitRemoveLeft}
          >
            <ArrowLeftToLine size={15} />
          </TimelineToolButton>
        )}
        {onSplitRemoveRight && (
          <TimelineToolButton
            title={canSplit ? 'Split and remove right (W)' : 'Move playhead over a clip'}
            disabled={!canSplit}
            onClick={onSplitRemoveRight}
          >
            <ArrowRightToLine size={15} />
          </TimelineToolButton>
        )}
        {onSeparateAudio && (
          <TimelineToolButton
            title={
              canSeparateAudio
                ? 'Separate audio from video — extract to audio track and mute the clip'
                : 'Select a video clip to separate its audio'
            }
            disabled={!canSeparateAudio}
            onClick={onSeparateAudio}
          >
            <Unlink size={15} />
          </TimelineToolButton>
        )}
        {onDuplicate && (
          <TimelineToolButton
            title={canDuplicate ? 'Duplicate selection (⌘D)' : 'Select a clip to duplicate'}
            disabled={!canDuplicate}
            onClick={onDuplicate}
          >
            <Copy size={15} strokeWidth={2} />
          </TimelineToolButton>
        )}
        <TimelineToolButton
          title={canDelete ? 'Delete selected clip (⌫)' : 'Select a clip to delete'}
          disabled={!canDelete}
          onClick={onDelete}
        >
          <StudioIcon name="bin" size={15} />
        </TimelineToolButton>
      </div>

      {onToggleBookmark && (
        <>
          <span className="studio-playback-divider studio-playback-divider--secondary" aria-hidden />
          <div className="studio-playback-tool-group">
            <TimelineToolButton
              active={isBookmarked}
              title={isBookmarked ? 'Remove bookmark (M)' : 'Add bookmark at playhead (M)'}
              onClick={onToggleBookmark}
            >
              <Bookmark size={15} fill={isBookmarked ? 'currentColor' : 'none'} />
            </TimelineToolButton>
          </div>
        </>
      )}
    </div>
  );
}
