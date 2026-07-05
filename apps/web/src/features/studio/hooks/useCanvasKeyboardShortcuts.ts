import { useEffect, type RefObject } from 'react';
import { useAppStore } from '@/features/project';

/** Studio global keyboard shortcuts. */
export function useCanvasKeyboardShortcuts(videoRef?: RefObject<HTMLVideoElement | null>) {
  const toggleCanvasPreviewAxis = useAppStore((s) => s.toggleCanvasPreviewAxis);
  const toggleCanvasAttachSnap = useAppStore((s) => s.toggleCanvasAttachSnap);
  const setCanvasTool = useAppStore((s) => s.setCanvasTool);
  const previewFullscreenOpen = useAppStore((s) => s.previewFullscreenOpen);
  const undoCanvas = useAppStore((s) => s.undoCanvas);
  const redoCanvas = useAppStore((s) => s.redoCanvas);
  const copyTimelineSelection = useAppStore((s) => s.copyTimelineSelection);
  const cutTimelineSelection = useAppStore((s) => s.cutTimelineSelection);
  const pasteTimelineClipboard = useAppStore((s) => s.pasteTimelineClipboard);
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

      // Space = play/pause (only when not in text input)
      if (e.code === 'Space' && !isEditable) {
        e.preventDefault();
        useAppStore.getState().toggleTimelinePlaying();
        return;
      }

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoCanvas(); return; }
      if (mod && (e.key === 'Z' || (e.key === 'z' && e.shiftKey) || e.key === 'y')) { e.preventDefault(); redoCanvas(); return; }

      if (isEditable) return;

      if (mod && e.key === 'c') { e.preventDefault(); copyTimelineSelection(); return; }
      if (mod && e.key === 'x') { e.preventDefault(); cutTimelineSelection(); return; }
      if (mod && e.key === 'v') { e.preventDefault(); pasteTimelineClipboard(); return; }
      if (mod && e.key === 'd') { e.preventDefault(); duplicateTimelineSelection(); return; }
      if (mod && e.key === 'a') { e.preventDefault(); selectAllTimelineClips(); return; }

      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteTimelineSelection(); return; }

      // Blade / razor: split footage and clips under the playhead.
      if (!mod && (e.key === 'b' || e.key === 'B')) {
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
        if (key === 's') { e.preventDefault(); toggleCanvasPreviewAxis(); }
        else if (key === 'n') { e.preventDefault(); toggleCanvasAttachSnap(); }
        else if (key === 'v') setCanvasTool('select');
        else if (key === 'h') setCanvasTool('pan');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    videoRef,
    previewFullscreenOpen,
    toggleCanvasPreviewAxis,
    toggleCanvasAttachSnap,
    setCanvasTool,
    undoCanvas,
    redoCanvas,
    copyTimelineSelection,
    cutTimelineSelection,
    pasteTimelineClipboard,
    duplicateTimelineSelection,
    deleteTimelineSelection,
    clearTimelineSelection,
    selectAllTimelineClips,
  ]);
}
