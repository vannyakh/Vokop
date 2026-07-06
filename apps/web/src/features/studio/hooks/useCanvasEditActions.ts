import { useCallback } from 'react';
import { useAppStore } from '@/features/project';
import {
  addCaptionAtPlayhead,
  addImageTrackAtPlayhead,
  addStickerTrackAtPlayhead,
  focusElementForCrop,
  focusVideoForCrop,
  openMediaPanel,
  resetVideoTransform,
  toggleElementFlip,
  toggleVideoFlip,
} from '@/features/studio/lib/canvasEditActions';
import { useTimelineSelection } from '@/features/studio/hooks/useTimelineSelection';
import { studioEdit } from '@/features/studio/services/studioEdit';

/** Clipboard, split, and canvas-specific actions for menus + toolbars. */
export function useCanvasEditActions() {
  const currentTime = useAppStore((s) => s.currentTime);
  const canvasPreviewAxis = useAppStore((s) => s.canvasPreviewAxis);
  const canvasAttachSnap = useAppStore((s) => s.canvasAttachSnap);
  const addCanvasImageOverlay = useAppStore((s) => s.addCanvasImageOverlay);
  const replaceCanvasElementImage = useAppStore((s) => s.replaceCanvasElementImage);
  const setCanvasTool = useAppStore((s) => s.setCanvasTool);
  const toggleCanvasPreviewAxis = useAppStore((s) => s.toggleCanvasPreviewAxis);
  const toggleCanvasAttachSnap = useAppStore((s) => s.toggleCanvasAttachSnap);

  const selection = useTimelineSelection();

  const pasteAtPlayhead = useCallback(
    () => selection.pasteSelection(currentTime),
    [selection, currentTime],
  );

  const selectVideoOnTimeline = useCallback(
    (clipId: string) => studioEdit.focusVideoClip(clipId, { openInspector: false }),
    [],
  );

  const replaceElementImage = useCallback(
    (elementId: string, file: File) => replaceCanvasElementImage(elementId, file),
    [replaceCanvasElementImage],
  );

  const addOverlayFromFile = useCallback(
    (file: File) => addCanvasImageOverlay(file),
    [addCanvasImageOverlay],
  );

  const removeCanvasElement = useAppStore((s) => s.removeCanvasElement);
  const duplicateCanvasElement = useAppStore((s) => s.duplicateCanvasElement);

  return {
    currentTime,
    canvasPreviewAxis,
    canvasAttachSnap,
    ...selection,
    pasteAtPlayhead,
    openMediaPanel,
    selectVideoOnTimeline,
    resetVideoTransform,
    toggleVideoFlip,
    toggleElementFlip,
    focusVideoForCrop,
    focusElementForCrop,
    replaceElementImage,
    addOverlayFromFile,
    addCaptionAtPlayhead,
    addImageTrackAtPlayhead,
    addStickerTrackAtPlayhead,
    setCanvasTool,
    toggleCanvasPreviewAxis,
    toggleCanvasAttachSnap,
    focusCanvasElement: studioEdit.focusCanvasElement,
    deleteCanvasElement: removeCanvasElement,
    duplicateCanvasElement,
  };
}

export type CanvasEditActions = ReturnType<typeof useCanvasEditActions>;
