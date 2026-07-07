import { useCallback, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  cropRectToPx,
  getCursorForCropHandle,
  resizeCropFromHandle,
  stagePointToBoxLocal,
  type CropHandle,
  type NormalizedCropRect,
} from '@/features/studio/lib/canvasCrop';
import type { CanvasOrientedBox } from '@/features/studio/lib/canvasTransformUtils';

interface CanvasCropOverlayProps {
  box: CanvasOrientedBox;
  cropRect: NormalizedCropRect;
  toStagePoint: (clientX: number, clientY: number) => { x: number; y: number };
  onCropRectChange: (rect: NormalizedCropRect) => void;
  onApply: () => void;
  onCancel: () => void;
}

interface DragSession {
  handle: CropHandle;
  startRect: NormalizedCropRect;
  startLocal: { x: number; y: number };
}

export function CanvasCropOverlay({
  box,
  cropRect,
  toStagePoint,
  onCropRectChange,
  onApply,
  onCancel,
}: CanvasCropOverlayProps) {
  const sessionRef = useRef<DragSession | null>(null);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const rotation = box.rotation ?? 0;
  const cropPx = cropRectToPx(cropRect, box);

  const onPointerDown = useCallback(
    (handle: CropHandle, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const start = toStagePoint(e.clientX, e.clientY);
      sessionRef.current = {
        handle,
        startRect: cropRect,
        startLocal: stagePointToBoxLocal(start.x, start.y, box),
      };

      const onMove = (ev: PointerEvent) => {
        const session = sessionRef.current;
        if (!session) return;
        const point = toStagePoint(ev.clientX, ev.clientY);
        const local = stagePointToBoxLocal(point.x, point.y, box);
        onCropRectChange(
          resizeCropFromHandle(session.startRect, session.handle, local, session.startLocal, box),
        );
      };

      const onUp = () => {
        sessionRef.current = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [box, cropRect, onCropRectChange, toStagePoint],
  );

  const handles: { id: CropHandle; x: number; y: number }[] = [
    { id: 'top-left', x: cropPx.x, y: cropPx.y },
    { id: 'top-right', x: cropPx.x + cropPx.width, y: cropPx.y },
    { id: 'bottom-left', x: cropPx.x, y: cropPx.y + cropPx.height },
    { id: 'bottom-right', x: cropPx.x + cropPx.width, y: cropPx.y + cropPx.height },
    { id: 'top', x: cropPx.x + cropPx.width / 2, y: cropPx.y },
    { id: 'bottom', x: cropPx.x + cropPx.width / 2, y: cropPx.y + cropPx.height },
    { id: 'left', x: cropPx.x, y: cropPx.y + cropPx.height / 2 },
    { id: 'right', x: cropPx.x + cropPx.width, y: cropPx.y + cropPx.height / 2 },
  ];

  return (
    <div className="canvas-crop-overlay" aria-hidden>
      <svg
        className="canvas-crop-overlay__svg"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <defs>
          <mask id="canvas-crop-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={cropPx.x}
              y={cropPx.y}
              width={cropPx.width}
              height={cropPx.height}
              fill="black"
              transform={`rotate(${rotation} ${cx} ${cy})`}
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.55)"
          mask="url(#canvas-crop-mask)"
        />
        <rect
          x={cropPx.x + 0.5}
          y={cropPx.y + 0.5}
          width={Math.max(cropPx.width - 1, 0)}
          height={Math.max(cropPx.height - 1, 0)}
          fill="transparent"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          transform={`rotate(${rotation} ${cx} ${cy})`}
        />
      </svg>

      <div
        className="canvas-crop-window"
        style={{
          position: 'absolute',
          left: cropPx.x,
          top: cropPx.y,
          width: cropPx.width,
          height: cropPx.height,
          transform: rotation ? `rotate(${rotation}deg)` : undefined,
          transformOrigin: `${cropPx.width / 2}px ${cropPx.height / 2}px`,
          cursor: 'move',
          pointerEvents: 'auto',
        }}
        onPointerDown={(e) => onPointerDown('move', e)}
      />

      {handles.map((h) => (
        <button
          key={h.id}
          type="button"
          className={cn('canvas-crop-handle', `canvas-crop-handle--${h.id}`)}
          style={{
            left: h.x - 7,
            top: h.y - 7,
            cursor: getCursorForCropHandle(h.id),
          }}
          aria-hidden
          onPointerDown={(e) => onPointerDown(h.id, e)}
        />
      ))}

      <div className="canvas-crop-actions">
        <button type="button" className="canvas-crop-action-btn" onClick={onCancel}>
          <X size={14} />
          Cancel
        </button>
        <button
          type="button"
          className={cn('canvas-crop-action-btn', 'canvas-crop-action-btn--apply')}
          onClick={onApply}
        >
          <Check size={14} />
          Apply
        </button>
      </div>
    </div>
  );
}
