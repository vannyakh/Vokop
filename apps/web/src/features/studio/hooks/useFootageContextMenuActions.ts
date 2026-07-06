import { useCallback, useMemo } from 'react';
import { useAppStore } from '@/features/project';
import { useTimelineSelection } from '@/features/studio/hooks/useTimelineSelection';
import type { FootageContextMenuActions } from '@/features/studio/lib/timelineFootageContextMenuItems';
import {
  downloadFootageClip,
  downloadFootageFrame,
  freezeFootageAtPlayhead,
  openFootageMediaReplace,
  openTranscriptEditor,
  separateFootageAudio,
  splitFootageScene,
} from '@/features/studio/lib/timelineFootageActions';

export function useFootageContextMenuActions(
  clipId?: string | null,
  pasteAtTime?: number,
  fromTrackId?: string | null,
): FootageContextMenuActions {
  const currentTime = useAppStore((s) => s.currentTime);
  const videoClips = useAppStore((s) => s.videoClips);
  const promoteTimelineClipToMaster = useAppStore((s) => s.promoteTimelineClipToMaster);
  const selection = useTimelineSelection();
  const pasteTime = pasteAtTime ?? currentTime;

  const canPromoteToMaster = useMemo(() => {
    if (!clipId || !fromTrackId || fromTrackId === 'video') return false;
    return videoClips.some((c) => c.id === clipId);
  }, [clipId, fromTrackId, videoClips]);

  const promoteToMaster = useCallback(() => {
    if (!clipId || !fromTrackId) return;
    promoteTimelineClipToMaster(clipId, String(fromTrackId));
  }, [clipId, fromTrackId, promoteTimelineClipToMaster]);

  const split = useCallback(() => selection.splitAtPlayhead(), [selection]);
  const copy = useCallback(() => selection.copySelection(), [selection]);
  const cut = useCallback(() => selection.cutSelection(), [selection]);
  const duplicate = useCallback(() => selection.duplicateSelection(), [selection]);
  const deleteSelection = useCallback(() => selection.deleteSelection(), [selection]);
  const paste = useCallback(
    () => selection.pasteSelection(pasteTime),
    [selection, pasteTime],
  );

  const replace = useCallback(() => openFootageMediaReplace(clipId ?? undefined), [clipId]);
  const downloadClip = useCallback(
    () => downloadFootageClip(clipId ?? undefined),
    [clipId],
  );
  const downloadFrame = useCallback(
    () => downloadFootageFrame(clipId ?? undefined),
    [clipId],
  );
  const separateAudio = useCallback(
    () => separateFootageAudio(clipId ?? undefined),
    [clipId],
  );
  const freeze = useCallback(
    () => void freezeFootageAtPlayhead(clipId ?? undefined),
    [clipId],
  );

  return useMemo(
    (): FootageContextMenuActions => ({
      split,
      copy,
      cut,
      paste,
      duplicate,
      delete: deleteSelection,
      replace,
      downloadClip,
      downloadFrame,
      openTranscriptEditor,
      separateAudio,
      splitScene: splitFootageScene,
      freeze,
      promoteToMaster,
      canPromoteToMaster,
      canSplit: selection.canSplit,
      canDelete: selection.canDelete,
      hasClipboard: selection.hasClipboard,
      hasClipSelection: selection.hasSelection,
    }),
    [
      split,
      copy,
      cut,
      paste,
      duplicate,
      deleteSelection,
      replace,
      downloadClip,
      downloadFrame,
      separateAudio,
      freeze,
      promoteToMaster,
      canPromoteToMaster,
      selection.canSplit,
      selection.canDelete,
      selection.hasClipboard,
      selection.hasSelection,
    ],
  );
}
