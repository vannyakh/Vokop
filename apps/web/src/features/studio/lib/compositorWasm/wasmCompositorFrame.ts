import { getDisplayRatio } from '@vokop/shared';
import { buildCompositorFrameDescriptor } from '@/features/studio/lib/compositorFrameDescriptor';
import type { CanvasRect } from '@/features/studio/lib/canvasCoords';
import { getVideoContentRect } from '@/features/studio/lib/canvasCoords';
import {
  buildCompositorTextures,
  toWasmFrameDescriptor,
  wasmCompositorEngine,
} from '@/features/studio/lib/compositorWasm';
import type { CompositionBackground } from '@vokop/shared';
import type { CanvasElement } from '@/types/canvas';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';

export interface RenderWasmCompositorFrameInput {
  exportSize: { width: number; height: number };
  videoSize: { width: number; height: number };
  aspectRatio: import('@vokop/shared').AspectRatioId;
  contentRect?: CanvasRect;
  currentTime: number;
  videoClip: MediaClip | null;
  canvasElements: CanvasElement[];
  compositionBackground: CompositionBackground;
  videoFrame: CanvasImageSource | null;
  videoFrameWidth: number;
  videoFrameHeight: number;
  imageBySrc: ReadonlyMap<string, HTMLImageElement>;
}

export interface RenderWasmCompositorFrameResult {
  compositorCanvas: HTMLCanvasElement;
}

export function resolveWasmContentRect(input: {
  exportSize: { width: number; height: number };
  videoSize: { width: number; height: number };
  aspectRatio: import('@vokop/shared').AspectRatioId;
}): CanvasRect {
  const displayRatio = getDisplayRatio(input.aspectRatio, input.videoSize.width, input.videoSize.height);
  return getVideoContentRect(input.exportSize, input.videoSize, displayRatio);
}

/** Render one frame through the OpenCut WASM compositor. */
export async function renderWasmCompositorFrame(
  input: RenderWasmCompositorFrameInput,
): Promise<RenderWasmCompositorFrameResult> {
  const contentRect = input.contentRect ?? resolveWasmContentRect(input);

  const textures = buildCompositorTextures({
    contentRect,
    currentTime: input.currentTime,
    videoClip: input.videoClip,
    canvasElements: input.canvasElements,
    videoFrame: input.videoFrame,
    videoFrameWidth: input.videoFrameWidth,
    videoFrameHeight: input.videoFrameHeight,
    imageBySrc: input.imageBySrc,
  });

  const uploadedIds = new Set(textures.map((t) => t.id));
  const frame = buildCompositorFrameDescriptor({
    contentRect,
    frameSize: input.exportSize,
    currentTime: input.currentTime,
    videoClip: input.videoClip,
    canvasElements: input.canvasElements,
    compositionBackground: input.compositionBackground,
    uploadedTextureIds: uploadedIds,
  });

  await wasmCompositorEngine.ensureInitialized({
    width: input.exportSize.width,
    height: input.exportSize.height,
  });
  await wasmCompositorEngine.syncTextures(textures);
  await wasmCompositorEngine.render(toWasmFrameDescriptor(frame));

  return { compositorCanvas: wasmCompositorEngine.getCanvas() };
}

/** Blit WASM compositor output into a 2D export canvas. */
export function blitWasmCompositorToCanvas(
  targetCtx: CanvasRenderingContext2D,
  compositorCanvas: HTMLCanvasElement,
  exportSize: { width: number; height: number },
): void {
  targetCtx.drawImage(compositorCanvas, 0, 0, exportSize.width, exportSize.height);
}
