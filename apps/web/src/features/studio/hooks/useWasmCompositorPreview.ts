import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompositionBackground } from '@vokop/shared';
import { buildCompositorFrameDescriptor } from '@/features/studio/lib/compositorFrameDescriptor';
import type { CanvasRect } from '@/features/studio/lib/canvasCoords';
import {
  buildCompositorTextures,
  initializeWasmGpuRenderer,
  isWasmCompositorEnabled,
  isWasmGpuAvailable,
  getWasmGpuInitError,
  toWasmFrameDescriptor,
  wasmCompositorEngine,
} from '@/features/studio/lib/compositorWasm';
import { ensureFontsForCanvasElements } from '@/features/studio/lib/fontLoader';
import type { CanvasElement } from '@/types/canvas';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';

export interface UseWasmCompositorPreviewInput {
  enabled?: boolean;
  contentRect: CanvasRect;
  currentTime: number;
  videoClip: MediaClip | null;
  canvasElements: CanvasElement[];
  compositionBackground: CompositionBackground;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
}

export interface UseWasmCompositorPreviewResult {
  active: boolean;
  ready: boolean;
  error: string | null;
  compositorCanvas: HTMLCanvasElement | null;
  remountCompositorCanvas: (container: HTMLElement) => void;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function useWasmCompositorPreview(
  input: UseWasmCompositorPreviewInput,
): UseWasmCompositorPreviewResult {
  const active = (input.enabled ?? isWasmCompositorEnabled()) && input.contentRect.width > 0;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compositorCanvas, setCompositorCanvas] = useState<HTMLCanvasElement | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const renderTokenRef = useRef(0);
  const mountedContainerRef = useRef<HTMLElement | null>(null);

  const remountCompositorCanvas = useCallback((container: HTMLElement) => {
    mountedContainerRef.current = container;
    const canvas = wasmCompositorEngine.getCanvas();
    if (canvas.parentElement !== container) {
      container.replaceChildren(canvas);
    }
    setCompositorCanvas(canvas);
  }, []);

  useEffect(() => {
    if (!active) {
      setReady(false);
      setError(null);
      setCompositorCanvas(null);
      return;
    }

    let cancelled = false;
    void initializeWasmGpuRenderer().then(() => {
      if (cancelled) return;
      if (!isWasmGpuAvailable()) {
        setError(getWasmGpuInitError() ?? 'WASM GPU renderer unavailable');
        setReady(false);
        return;
      }
      setReady(true);
      setError(null);
    });

    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (!active || !ready) return;

    let cancelled = false;

    void (async () => {
      const cache = imageCacheRef.current;
      const visibleIds = new Set(
        input.canvasElements
          .filter((el) => el.type === 'image' || el.type === 'logo')
          .map((el) => el.id),
      );
      for (const [id] of cache) {
        if (!visibleIds.has(id)) cache.delete(id);
      }

      await Promise.all(
        input.canvasElements
          .filter((el) => (el.type === 'image' || el.type === 'logo') && el.src)
          .map(async (el) => {
            if (cache.has(el.id)) return;
            const img = await loadImage(el.src!);
            if (!cancelled && img) cache.set(el.id, img);
          }),
      );

      await ensureFontsForCanvasElements(input.canvasElements);

      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [active, ready, input.canvasElements]);

  const renderFrame = useCallback(async () => {
    if (!active || !ready) return;

    const token = ++renderTokenRef.current;
    const video = input.videoRef.current;

    try {
      const textures = buildCompositorTextures({
        contentRect: input.contentRect,
        currentTime: input.currentTime,
        videoClip: input.videoClip,
        canvasElements: input.canvasElements,
        videoFrame: video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA ? video : null,
        videoFrameWidth: video?.videoWidth ?? 0,
        videoFrameHeight: video?.videoHeight ?? 0,
        imageByElementId: imageCacheRef.current,
      });

      const uploadedIds = new Set(textures.map((t) => t.id));
      const frame = buildCompositorFrameDescriptor({
        contentRect: input.contentRect,
        currentTime: input.currentTime,
        videoClip: input.videoClip,
        canvasElements: input.canvasElements,
        compositionBackground: input.compositionBackground,
        uploadedTextureIds: uploadedIds,
      });

      await wasmCompositorEngine.ensureInitialized({
        width: frame.width,
        height: frame.height,
      });
      if (token !== renderTokenRef.current) return;

      await wasmCompositorEngine.syncTextures(textures);
      if (token !== renderTokenRef.current) return;

      await wasmCompositorEngine.render(toWasmFrameDescriptor(frame));
      if (token !== renderTokenRef.current) return;

      const canvas = wasmCompositorEngine.getCanvas();
      setCompositorCanvas(canvas);
      const container = mountedContainerRef.current;
      if (container && canvas.parentElement !== container) {
        container.replaceChildren(canvas);
      }
    } catch (err) {
      if (token !== renderTokenRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [
    active,
    ready,
    input.contentRect,
    input.currentTime,
    input.videoClip,
    input.canvasElements,
    input.compositionBackground,
    input.videoRef,
  ]);

  useEffect(() => {
    if (!active || !ready) return;
    void renderFrame();
  }, [active, ready, renderFrame]);

  useEffect(() => {
    if (!active || !ready || !input.isPlaying) return;

    let raf = 0;
    const tick = () => {
      void renderFrame();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, ready, input.isPlaying, renderFrame]);

  useEffect(() => {
    return () => {
      if (active) wasmCompositorEngine.dispose();
    };
  }, [active]);

  return {
    active,
    ready,
    error,
    compositorCanvas,
    remountCompositorCanvas,
  };
}
