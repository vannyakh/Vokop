import { useEffect } from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';

export function StudioHeaderHistoryTools() {
  const undoCanvas = useAppStore((s) => s.undoCanvas);
  const redoCanvas = useAppStore((s) => s.redoCanvas);
  const canUndoCanvas = useAppStore((s) => s.canvasUndoStack.length > 0);
  const canRedoCanvas = useAppStore((s) => s.canvasRedoStack.length > 0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      if (e.shiftKey) redoCanvas();
      else undoCanvas();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undoCanvas, redoCanvas]);

  return (
    <div className="studio-header-history-tools" role="toolbar" aria-label="History">
      <button
        type="button"
        title="Undo (⌘Z)"
        disabled={!canUndoCanvas}
        onClick={undoCanvas}
        className={cn('studio-header-canvas-tool-btn', !canUndoCanvas && 'disabled')}
      >
        <Undo2 size={15} strokeWidth={2} />
      </button>
      <button
        type="button"
        title="Redo (⌘⇧Z)"
        disabled={!canRedoCanvas}
        onClick={redoCanvas}
        className={cn('studio-header-canvas-tool-btn', !canRedoCanvas && 'disabled')}
      >
        <Redo2 size={15} strokeWidth={2} />
      </button>
    </div>
  );
}
