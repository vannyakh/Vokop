import { RotateCw } from 'lucide-react';
import { CANVAS_FRAME } from '@/features/studio/lib/canvasFrameTokens';
import {
  orientedBoxTopCenter,
  snapRotationDegrees,
  type CanvasOrientedBox,
} from '@/features/studio/lib/canvasTransformUtils';

interface CanvasRotationHandleProps {
  box: CanvasOrientedBox;
  toStagePoint: (clientX: number, clientY: number) => { x: number; y: number };
  onRotate: (rotation: number) => void;
  onRotateEnd?: () => void;
}

export function CanvasRotationHandle({
  box,
  toStagePoint,
  onRotate,
  onRotateEnd,
}: CanvasRotationHandleProps) {
  const rotation = box.rotation ?? 0;
  const rad = (rotation * Math.PI) / 180;
  const topCenter = orientedBoxTopCenter(box);
  const handleX = topCenter.x + Math.sin(rad) * CANVAS_FRAME.rotationOffset;
  const handleY = topCenter.y - Math.cos(rad) * CANVAS_FRAME.rotationOffset;
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const start = toStagePoint(e.clientX, e.clientY);
    const startAngle = Math.atan2(start.y - centerY, start.x - centerX);
    const startRotation = rotation;

    const onMove = (ev: PointerEvent) => {
      const point = toStagePoint(ev.clientX, ev.clientY);
      const angle = Math.atan2(point.y - centerY, point.x - centerX);
      const delta = ((angle - startAngle) * 180) / Math.PI;
      onRotate(
        snapRotationDegrees(startRotation + delta, {
          shiftKey: ev.shiftKey,
          step: 15,
        }),
      );
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      onRotateEnd?.();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <svg
      className="canvas-rotation-handle-layer"
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
      <line
        x1={topCenter.x}
        y1={topCenter.y}
        x2={handleX}
        y2={handleY}
        stroke="rgba(255, 255, 255, 0.45)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <foreignObject x={handleX - 15} y={handleY - 15} width={30} height={30}>
        <button
          type="button"
          className="canvas-rotation-handle-btn"
          aria-label="Rotate"
          onPointerDown={onPointerDown}
        >
          <RotateCw size={13} strokeWidth={2.25} />
        </button>
      </foreignObject>
    </svg>
  );
}
