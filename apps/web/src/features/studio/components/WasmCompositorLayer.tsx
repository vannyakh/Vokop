import { useEffect, useRef } from 'react';
import type { CompositionBackground } from '@vokop/shared';
import type { CanvasRect } from '@/features/studio/lib/canvasCoords';
import { useWasmCompositorPreview } from '@/features/studio/hooks/useWasmCompositorPreview';
import type { CanvasElement } from '@/types/canvas';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';
import { cn } from '@/lib/cn';

export interface WasmCompositorLayerProps {
  contentRect: CanvasRect;
  currentTime: number;
  videoClip: MediaClip | null;
  canvasElements: CanvasElement[];
  compositionBackground: CompositionBackground;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  enabled?: boolean;
}

/**
 * Mounts the OpenCut WASM compositor output canvas over the preview content rect.
 * Konva overlays and selection handles remain on top until WASM reaches parity.
 */
export function WasmCompositorLayer({
  contentRect,
  currentTime,
  videoClip,
  canvasElements,
  compositionBackground,
  videoRef,
  isPlaying,
  enabled,
}: WasmCompositorLayerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const { active, ready, error, remountCompositorCanvas } = useWasmCompositorPreview({
    enabled,
    contentRect,
    currentTime,
    videoClip,
    canvasElements,
    compositionBackground,
    videoRef,
    isPlaying,
  });

  useEffect(() => {
    if (!active || !ready || !mountRef.current) return;
    remountCompositorCanvas(mountRef.current);
  }, [active, ready, remountCompositorCanvas]);

  if (!active) return null;

  return (
    <>
      <div
        ref={mountRef}
        className={cn(
          'studio-wasm-compositor-output',
          !ready && 'studio-wasm-compositor-output--loading',
        )}
        style={{
          left: contentRect.x,
          top: contentRect.y,
          width: contentRect.width,
          height: contentRect.height,
        }}
        aria-hidden
      />
      {error ? (
        <div className="studio-wasm-compositor-error" role="status">
          WASM preview unavailable: {error}
        </div>
      ) : null}
    </>
  );
}
