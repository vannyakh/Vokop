/**
 * OpenCut-compatible compositor frame descriptor (sample: @templates/OpenCut/rust/crates/compositor).
 * Builds JSON for WASM `renderFrame()` when `VITE_WASM_COMPOSITOR=1`.
 */

import type { CompositionBackground } from '@vokop/shared';
import type { CanvasRect } from '@/features/studio/lib/canvasCoords';
import { isElementVisible } from '@/features/studio/lib/canvasElements';
import { resolveCanvasElementPxLayout } from '@/features/studio/lib/canvasElementRasterizer';
import { resolveVideoClipLayout } from '@/features/studio/lib/videoClipLayout';
import type { CanvasElement } from '@/types/canvas';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';
import type { WasmLayerMask } from '@/features/studio/lib/compositorWasm/types';

export interface CompositorFrameClear {
  color: [number, number, number, number];
}

export interface CompositorQuadTransform {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  rotationDegrees: number;
  flipX: boolean;
  flipY: boolean;
}

export interface CompositorLayerItem {
  type: 'layer';
  textureId: string;
  transform: CompositorQuadTransform;
  opacity: number;
  blendMode: 'normal' | 'screen' | 'multiply';
  effectPassGroups?: unknown[][];
  mask?: WasmLayerMask | null;
}

export interface CompositorFrameDescriptor {
  width: number;
  height: number;
  clear: CompositorFrameClear;
  items: CompositorLayerItem[];
}

function pxToNormalizedTransform(
  layout: { x: number; y: number; width: number; height: number; rotation: number },
  frameWidth: number,
  frameHeight: number,
): CompositorQuadTransform {
  const cx = layout.x + layout.width * 0.5;
  const cy = layout.y + layout.height * 0.5;
  return {
    centerX: frameWidth > 0 ? cx / frameWidth : 0.5,
    centerY: frameHeight > 0 ? cy / frameHeight : 0.5,
    width: frameWidth > 0 ? layout.width / frameWidth : 1,
    height: frameHeight > 0 ? layout.height / frameHeight : 1,
    rotationDegrees: layout.rotation,
    flipX: false,
    flipY: false,
  };
}

function hexToRgba(hex: string): [number, number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return [0, 0, 0, 1];
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return [r, g, b, 1];
}

function clearFromBackground(background: CompositionBackground): CompositorFrameClear {
  if (background.mode === 'color' && background.color) {
    return { color: hexToRgba(background.color) };
  }
  return { color: [0, 0, 0, 1] };
}

export interface BuildCompositorFrameDescriptorInput {
  contentRect: CanvasRect;
  /** Output frame size; defaults to contentRect (preview). Export passes full exportSize. */
  frameSize?: { width: number; height: number };
  currentTime: number;
  videoClip: MediaClip | null;
  canvasElements: CanvasElement[];
  compositionBackground: CompositionBackground;
  /** Texture ids already uploaded to the WASM compositor. */
  uploadedTextureIds?: ReadonlySet<string>;
}

/**
 * Map the live preview state to an OpenCut `FrameDescriptor`.
 * Skip layers whose textures are not uploaded yet (caller handles uploadTexture).
 */
export function buildCompositorFrameDescriptor(
  input: BuildCompositorFrameDescriptorInput,
): CompositorFrameDescriptor {
  const { contentRect, currentTime, videoClip, canvasElements, compositionBackground } = input;
  const uploaded = input.uploadedTextureIds;
  const frameWidth = Math.max(1, Math.round(input.frameSize?.width ?? contentRect.width));
  const frameHeight = Math.max(1, Math.round(input.frameSize?.height ?? contentRect.height));
  const items: CompositorLayerItem[] = [];

  if (videoClip) {
    const textureId = `video:${videoClip.id}`;
    if (!uploaded || uploaded.has(textureId)) {
      const layout = resolveVideoClipLayout(videoClip, contentRect, currentTime);
      items.push({
        type: 'layer',
        textureId,
        transform: {
          ...pxToNormalizedTransform(layout, frameWidth, frameHeight),
          flipX: Boolean(videoClip.flipX),
          flipY: Boolean(videoClip.flipY),
        },
        opacity: layout.opacity,
        blendMode: 'normal',
        effectPassGroups: [],
        mask: null,
      });
    }
  }

  for (const element of canvasElements) {
    if (!isElementVisible(element, currentTime)) continue;
    const textureId = `canvas:${element.id}`;
    if (uploaded && !uploaded.has(textureId)) continue;

    const layout = resolveCanvasElementPxLayout(element, currentTime, contentRect);
    const layerHeight = element.type === 'logo' || element.type === 'image' ? layout.height : layout.boxHeight;

    items.push({
      type: 'layer',
      textureId,
      transform: {
        ...pxToNormalizedTransform(
          {
            x: layout.x,
            y: layout.y,
            width: layout.width,
            height: layerHeight,
            rotation: layout.rotation,
          },
          frameWidth,
          frameHeight,
        ),
        flipX: Boolean(element.flipX),
        flipY: Boolean(element.flipY),
      },
      opacity: layout.opacity,
      blendMode: 'normal',
      effectPassGroups: [],
      mask: null,
    });
  }

  return {
    width: frameWidth,
    height: frameHeight,
    clear: clearFromBackground(compositionBackground),
    items,
  };
}
