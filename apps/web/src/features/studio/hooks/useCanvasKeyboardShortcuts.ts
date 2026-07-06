import { useEffect, type RefObject } from 'react';
import { useAppStore } from '@/features/project';
import {
  TIMELINE_ZOOM_BUTTON_STEP,
  TIMELINE_ZOOM_MAX,
  TIMELINE_ZOOM_MIN,
} from '@/features/studio/lib/timelineTypes';
import { FRAME_STEP_SEC, isModKey } from '@/features/studio/lib/shortcutKeys';
import { openStudioChromeModal } from '@/features/studio/lib/studioChrome';

/** Studio global keyboard shortcuts. */
export function useCanvasKeyboardShortcuts(videoRef?: RefObject<HTMLVideoElement | null>) {
  const toggleCanvasPreviewAxis = useAppStore((s) => s.toggleCanvasPreviewAxis);
  const toggleCanvasAttachSnap = useAppStore((s) => s.toggleCanvasAttachSnap);
  const setCanvasTool = useAppStore((s) => s.setCanvasTool);
  const previewFullscreenOpen = useAppStore((s) => s.previewFullscreenOpen);
  const togglePreviewFullscreen = useAppStore((s) => s.togglePreviewFullscreen);
  const setTimelineZoom = useAppStore((s) => s.setTimelineZoom);
  const undoCanvas = useAppStore((s) => s.undoCanvas);
  const redoCanvas = useAppStore((s) => s.redoCanvas);
  const copyTimelineSelection = useAppStore((s) => s.copyTimelineSelection);
  const cutTimelineSelection = useAppStore((s) => s.cutTimelineSelection);
  const duplicateTimelineSelection = useAppStore((s) => s.duplicateTimelineSelection);
  const deleteTimelineSelection = useAppStore((s) => s.deleteTimelineSelection);
  const clearTimelineSelection = useAppStore((s) => s.clearTimelineSelection);
  const selectAllTimelineClips = useAppStore((s) => s.selectAllTimelineClips);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (previewFullscreenOpen) return;

      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (e.target as HTMLElement | null)?.isContentEditable;

      const mod = isModKey(e);

      // Space = play/pause (only when not in text input)
      if (e.code === 'Space' && !isEditable) {
        e.preventDefault();
        useAppStore.getState().toggleTimelinePlaying();
        return;
      }

      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoCanvas();
        return;
      }
      if (mod && (e.key === 'Z' || (e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        redoCanvas();
        return;
      }

      if (mod && e.key === ',') {
        e.preventDefault();
        openStudioChromeModal('settings');
        return;
      }

      if (mod && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        togglePreviewFullscreen();
        return;
      }

      if (mod && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        const zoom = useAppStore.getState().timelineZoom;
        setTimelineZoom(Math.min(TIMELINE_ZOOM_MAX, zoom + TIMELINE_ZOOM_BUTTON_STEP));
        return;
      }
      if (mod && e.key === '-') {
        e.preventDefault();
        const zoom = useAppStore.getState().timelineZoom;
        setTimelineZoom(Math.max(TIMELINE_ZOOM_MIN, zoom - TIMELINE_ZOOM_BUTTON_STEP));
        return;
      }

      if (mod && e.key === 'ArrowLeft') {
        e.preventDefault();
        const { currentTime } = useAppStore.getState();
        useAppStore.getState().setCurrentTime(Math.max(0, currentTime - FRAME_STEP_SEC));
        return;
      }
      if (mod && e.key === 'ArrowRight') {
        e.preventDefault();
        const { currentTime, duration } = useAppStore.getState();
        useAppStore.getState().setCurrentTime(Math.min(duration, currentTime + FRAME_STEP_SEC));
        return;
      }

      if (isEditable) return;

      if (mod && e.key === 'c') {
        e.preventDefault();
        copyTimelineSelection();
        return;
      }
      if (mod && e.key === 'x') {
        e.preventDefault();
        cutTimelineSelection();
        return;
      }
      // ⌘V is handled by the `paste` event (usePasteMedia): media files from the
      // OS clipboard import to the library; otherwise it pastes the internal clip.
      if (mod && e.key === 'd') {
        e.preventDefault();
        duplicateTimelineSelection();
        return;
      }
      if (mod && e.key === 'a') {
        e.preventDefault();
        selectAllTimelineClips();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteTimelineSelection();
        return;
      }

      // Split at playhead — Omniclip ⌘B; also plain B for quick blade.
      if ((mod && e.key.toLowerCase() === 'b') || (!mod && !e.altKey && e.key.toLowerCase() === 'b')) {
        e.preventDefault();
        useAppStore.getState().splitTimelineAtPlayhead();
        return;
      }

      if (e.key === 'Escape') {
        clearTimelineSelection({ clearCanvas: true });
        return;
      }

      if (!mod && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 's') {
          e.preventDefault();
          toggleCanvasPreviewAxis();
        } else if (key === 'n') {
          e.preventDefault();
          toggleCanvasAttachSnap();
        } else if (key === 'v') {
          setCanvasTool('select');
        } else if (key === 'h') {
          setCanvasTool('pan');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    videoRef,
    previewFullscreenOpen,
    togglePreviewFullscreen,
    setTimelineZoom,
    toggleCanvasPreviewAxis,
    toggleCanvasAttachSnap,
    setCanvasTool,
    undoCanvas,
    redoCanvas,
    copyTimelineSelection,
    cutTimelineSelection,
    duplicateTimelineSelection,
    deleteTimelineSelection,
    clearTimelineSelection,
    selectAllTimelineClips,
  ]);
}
