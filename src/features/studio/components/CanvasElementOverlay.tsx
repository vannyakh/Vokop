import { useRef } from 'react';
import { Copy, ImageIcon, Trash2, Type } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import type { CanvasElement } from '@/types/canvas';

interface CanvasElementOverlayProps {
  element: CanvasElement;
  stageSize: { width: number; height: number };
  onEditText: () => void;
}

export function CanvasElementOverlay({ element, stageSize, onEditText }: CanvasElementOverlayProps) {
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const removeCanvasElement = useAppStore((s) => s.removeCanvasElement);
  const duplicateCanvasElement = useAppStore((s) => s.duplicateCanvasElement);
  const replaceCanvasElementImage = useAppStore((s) => s.replaceCanvasElementImage);

  const isImage = element.type === 'logo' || element.type === 'image';
  const boxHeight = isImage ? element.height : element.fontSize * 1.6;

  const toolbarTop = Math.max(4, element.y - 36);
  const toolbarLeft = Math.min(
    Math.max(4, element.x),
    Math.max(4, stageSize.width - 180),
  );

  const onReplacePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) replaceCanvasElementImage(element.id, file);
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={onReplacePick}
      />

      <div
        className="canvas-element-toolbar"
        style={{ left: toolbarLeft, top: toolbarTop }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {!isImage && (
          <button
            type="button"
            className="canvas-element-toolbar-btn"
            title="Edit text"
            onClick={onEditText}
          >
            <Type size={14} />
          </button>
        )}
        {isImage && (
          <button
            type="button"
            className="canvas-element-toolbar-btn"
            title="Replace image"
            onClick={() => replaceInputRef.current?.click()}
          >
            <ImageIcon size={14} />
          </button>
        )}
        <button
          type="button"
          className="canvas-element-toolbar-btn"
          title="Duplicate"
          onClick={() => duplicateCanvasElement(element.id)}
        >
          <Copy size={14} />
        </button>
        <button
          type="button"
          className={cn('canvas-element-toolbar-btn', 'canvas-element-toolbar-btn--danger')}
          title="Delete"
          onClick={() => removeCanvasElement(element.id)}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </>
  );
}

interface CanvasInlineTextEditorProps {
  element: CanvasElement;
  onCommit: (text: string) => void;
  onCancel: () => void;
}

export function CanvasInlineTextEditor({ element, onCommit, onCancel }: CanvasInlineTextEditorProps) {
  const style = element.textStyle;
  const boxHeight = element.fontSize * 1.6;

  return (
    <textarea
      className="canvas-inline-text-editor"
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        minHeight: boxHeight,
        fontSize: element.fontSize,
        fontFamily: element.fontFamily ? `${element.fontFamily}, system-ui, sans-serif` : undefined,
        fontWeight: style?.fontWeight === 'bold' ? 700 : 500,
        fontStyle: style?.fontStyle === 'italic' ? 'italic' : 'normal',
        textAlign: style?.align ?? 'center',
        color: style?.fill ?? '#ffffff',
        letterSpacing: style?.letterSpacing ? `${style.letterSpacing}px` : undefined,
        textTransform: style?.textTransform,
        background: style?.background ?? 'rgba(0,0,0,0.35)',
      }}
      autoFocus
      defaultValue={element.text}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onCommit(e.currentTarget.value);
        }
      }}
      onBlur={(e) => onCommit(e.currentTarget.value)}
    />
  );
}
