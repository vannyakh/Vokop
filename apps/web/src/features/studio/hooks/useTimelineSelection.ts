import { useCallback, useMemo } from 'react';
import { useAppStore } from '@/features/project';
import type {
  TimelineSelectionItem,
  TimelineTrackId,
} from '@/features/studio/lib/timelineTypes';
import {
  isTimelineItemSelected,
  resolveTimelineSelectionItems,
  timelineSelectionKey,
} from '@/features/studio/lib/timelineSelection';
import {
  isAudioLikeTimelineTrack,
  isEditableTimelineTrack,
  isVisualTimelineTrack,
} from '@/features/studio/lib/timelineTrackUtils';

export type TimelineSelectEvent = Pick<
  MouseEvent,
  'shiftKey' | 'metaKey' | 'ctrlKey'
>;

/**
 * Timeline item selection: primary + multi-select, canvas sync, and actions.
 * Prefer this over reading `selectedTimelineClip` / `selectedTimelineClips` directly.
 */
export function useTimelineSelection() {
  const primary = useAppStore((s) => s.selectedTimelineClip);
  const selectedTimelineClips = useAppStore((s) => s.selectedTimelineClips);
  const selectTimelineClip = useAppStore((s) => s.selectTimelineClip);
  const setTimelineSelection = useAppStore((s) => s.setTimelineSelection);
  const clearTimelineSelection = useAppStore((s) => s.clearTimelineSelection);
  const deleteTimelineSelection = useAppStore((s) => s.deleteTimelineSelection);
  const copyTimelineSelection = useAppStore((s) => s.copyTimelineSelection);
  const cutTimelineSelection = useAppStore((s) => s.cutTimelineSelection);
  const pasteTimelineClipboard = useAppStore((s) => s.pasteTimelineClipboard);
  const duplicateTimelineSelection = useAppStore((s) => s.duplicateTimelineSelection);
  const timelineClipboard = useAppStore((s) => s.timelineClipboard);

  const items = useMemo(
    () => resolveTimelineSelectionItems(primary, selectedTimelineClips),
    [primary, selectedTimelineClips],
  );

  const selectedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of items) keys.add(timelineSelectionKey(item));
    return keys;
  }, [items]);

  const isSelected = useCallback(
    (trackId: TimelineTrackId | string, clipId: string) =>
      selectedKeys.has(`${trackId}::${clipId}`) ||
      isTimelineItemSelected(primary, selectedTimelineClips, trackId as TimelineTrackId, clipId),
    [primary, selectedTimelineClips, selectedKeys],
  );

  const selectClip = useCallback(
    (trackId: TimelineTrackId, clipId: string, e?: TimelineSelectEvent) => {
      const multi = Boolean(e && (e.shiftKey || e.metaKey || e.ctrlKey));
      selectTimelineClip(
        { trackId, clipId },
        {
          mode: multi ? 'toggle' : 'replace',
          syncCanvas: true,
          openInspector: true,
        },
      );
    },
    [selectTimelineClip],
  );

  const selectItems = useCallback(
    (next: TimelineSelectionItem[], nextPrimary?: TimelineSelectionItem | null) => {
      setTimelineSelection(next, nextPrimary, { syncCanvas: true });
    },
    [setTimelineSelection],
  );

  const clearSelection = useCallback(
    (options?: { clearCanvas?: boolean }) => {
      clearTimelineSelection(options);
    },
    [clearTimelineSelection],
  );

  const trackId = primary?.trackId;
  const clipId = primary?.clipId;

  const canDelete = isEditableTimelineTrack(trackId);
  const canEditCanvas = isEditableTimelineTrack(trackId);
  const canAddKeyframe = Boolean(
    clipId &&
      isEditableTimelineTrack(trackId) &&
      !isAudioLikeTimelineTrack(trackId) &&
      trackId !== 'video',
  );
  const canSplit =
    trackId === 'video' ||
    trackId === 'audio' ||
    trackId === 'text' ||
    (isVisualTimelineTrack(trackId) && Boolean(clipId));

  return {
    primary,
    items,
    count: items.length,
    hasSelection: items.length > 0,
    hasClipboard: Boolean(timelineClipboard?.length),
    isSelected,
    selectClip,
    selectItems,
    clearSelection,
    deleteSelection: deleteTimelineSelection,
    copySelection: copyTimelineSelection,
    cutSelection: cutTimelineSelection,
    pasteSelection: pasteTimelineClipboard,
    duplicateSelection: duplicateTimelineSelection,
    canDelete,
    canEditCanvas,
    canAddKeyframe,
    canSplit,
  };
}
