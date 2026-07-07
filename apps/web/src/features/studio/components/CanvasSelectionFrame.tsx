import { CANVAS_FRAME } from '@/features/studio/lib/canvasFrameTokens';
import type { CanvasOrientedBox } from '@/features/studio/lib/canvasTransformUtils';

interface CanvasSelectionFrameProps {
  box: CanvasOrientedBox;
}

/**
 * Fallback SVG outline when Konva transformer border is unavailable (e.g. during toolbar-only preview).
 * Matches CapCut white selection stroke.
 */
export function CanvasSelectionFrame({ box }: CanvasSelectionFrameProps) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const rotation = box.rotation ?? 0;

  return (
    <svg
      className="canvas-selection-frame-layer"
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <rect
        x={box.x + 0.5}
        y={box.y + 0.5}
        width={Math.max(box.width - 1, 0)}
        height={Math.max(box.height - 1, 0)}
        fill="transparent"
        stroke={CANVAS_FRAME.borderColor}
        strokeWidth={CANVAS_FRAME.borderWidth}
        vectorEffect="non-scaling-stroke"
        transform={`rotate(${rotation} ${cx} ${cy})`}
      />
    </svg>
  );
}
