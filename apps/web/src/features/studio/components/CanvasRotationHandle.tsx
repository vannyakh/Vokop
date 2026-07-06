import { RotateCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { CANVAS_FRAME } from '@/features/studio/lib/canvasFrameTokens';
import {
  orientedBoxBottomCenter,
  snapRotationDegrees,
  type CanvasOrientedBox,
} from '@/features/studio/lib/canvasTransformUtils';

interface CanvasRotationHandleProps {
  box: CanvasOrientedBox;
  accent: string;
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
  const anchor = orientedBoxBottomCenter(box);
  const handleY = anchor.y + CANVAS_FRAME.rotationGap;
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const start = toStagePoint(e.clientX, e.clientY);
    const startAngle = Math.atan2(start.y - centerY, start.x - centerX);
    const startRotation = box.rotation ?? 0;

    const onMove = (ev: PointerEvent) => {
      const point = toStagePoint(ev.clientX, ev.clientY);
      const angle = Math.atan2(point.y - centerY, point.x - centerX);
      const delta = ((angle - startAngle) * 180) / Math.PI;
      const next = snapRotationDegrees(startRotation + delta, {
        shiftKey: ev.shiftKey,
        step: 15,
      });
      onRotate(next);
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
      <foreignObject x={anchor.x - 15} y={handleY - 15} width={30} height={30}>
        <button
          type="button"
          className={cn('canvas-rotation-handle-btn')}
          aria-label="Rotate"
          onPointerDown={onPointerDown}
        >
          <RotateCw size={14} strokeWidth={2.25} />
        </button>
      </foreignObject>
    </svg>
  );
}
