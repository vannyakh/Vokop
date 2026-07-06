import type { CanvasOrientedBox } from '@/features/studio/lib/canvasTransformUtils';

interface CanvasSelectionFrameProps {
  box: CanvasOrientedBox;
  accent: string;
}

/** Crisp SVG overlay that mirrors the Konva transformer frame (rotates with selection). */
export function CanvasSelectionFrame({ box, accent }: CanvasSelectionFrameProps) {
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
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        fill="transparent"
        stroke={accent}
        strokeWidth={1}
        transform={`rotate(${rotation} ${cx} ${cy})`}
      />
    </svg>
  );
}
