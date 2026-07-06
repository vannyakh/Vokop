import type { CanvasRect } from '@/features/studio/lib/canvasCoords';
import { toPxBox, toPxFontSize } from '@/features/studio/lib/canvasCoords';
import type { CanvasElement } from '@/types/canvas';

interface CanvasInlineTextEditorProps {
  element: CanvasElement;
  contentRect: CanvasRect;
  onCommit: (text: string) => void;
  onCancel: () => void;
}

export function CanvasInlineTextEditor({ element, contentRect, onCommit, onCancel }: CanvasInlineTextEditorProps) {
  const style = element.textStyle;
  const box = toPxBox(
    { x: element.x, y: element.y, width: element.width, height: element.fontSize * 1.6 },
    contentRect,
  );
  const fontSizePx = toPxFontSize(element.fontSize, contentRect);
  const boxHeight = fontSizePx * 1.6;

  return (
    <textarea
      className="canvas-inline-text-editor"
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        minHeight: boxHeight,
        fontSize: fontSizePx,
        fontFamily: element.fontFamily ? `${element.fontFamily}, system-ui, sans-serif` : undefined,
        fontWeight: style?.fontWeight === 'bold' ? 700 : 500,
        fontStyle: style?.fontStyle === 'italic' ? 'italic' : 'normal',
        textDecoration: style?.underline ? 'underline' : undefined,
        lineHeight: style?.lineHeight ?? 1.35,
        textAlign: style?.align ?? 'center',
        whiteSpace: style?.wrap === 'none' ? 'pre' : undefined,
        wordBreak: style?.wrap === 'char' ? 'break-all' : undefined,
        color: style?.fill ?? '#ffffff',
        background: style?.fillGradient
          ? `linear-gradient(${style.fillGradient.direction === 'vertical' ? '180deg' : '90deg'}, ${style.fillGradient.colors[0]}, ${style.fillGradient.colors[1]})`
          : style?.background ?? 'rgba(0,0,0,0.35)',
        backgroundClip: style?.fillGradient ? 'text' : undefined,
        WebkitBackgroundClip: style?.fillGradient ? 'text' : undefined,
        WebkitTextFillColor: style?.fillGradient ? 'transparent' : undefined,
        letterSpacing: style?.letterSpacing ? `${style.letterSpacing}px` : undefined,
        textTransform: style?.textTransform,
        borderRadius: style?.background ? (style?.backgroundRadius ?? 8) : undefined,
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
