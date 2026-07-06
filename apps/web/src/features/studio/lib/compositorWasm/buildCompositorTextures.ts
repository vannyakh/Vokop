import type { CanvasRect } from '@/features/studio/lib/canvasCoords';
import { isElementVisible } from '@/features/studio/lib/canvasElements';
import {
  canvasElementTextureHash,
  drawCanvasElementUntransformed,
  resolveCanvasElementPxLayout,
} from '@/features/studio/lib/canvasElementRasterizer';
import type { WasmTextureUpload } from '@/features/studio/lib/compositorWasm/types';
import type { CanvasElement } from '@/types/canvas';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';

export interface BuildCompositorTexturesInput {
  contentRect: CanvasRect;
  currentTime: number;
  videoClip: MediaClip | null;
  canvasElements: CanvasElement[];
  videoFrame: CanvasImageSource | null;
  videoFrameWidth: number;
  videoFrameHeight: number;
  /** Preview: element id → image. Export: src url → image (both maps may be used). */
  imageByElementId?: ReadonlyMap<string, HTMLImageElement>;
  imageBySrc?: ReadonlyMap<string, HTMLImageElement>;
}

function videoFrameReady(width: number, height: number): boolean {
  return width > 0 && height > 0;
}

function resolveImageForElement(
  element: CanvasElement,
  imageByElementId: ReadonlyMap<string, HTMLImageElement> | undefined,
  imageBySrc: ReadonlyMap<string, HTMLImageElement> | undefined,
): HTMLImageElement | undefined {
  if (imageByElementId?.has(element.id)) {
    return imageByElementId.get(element.id);
  }
  if (element.src && imageBySrc?.has(element.src)) {
    return imageBySrc.get(element.src);
  }
  return undefined;
}

function imageLookupMaps(
  imageByElementId: ReadonlyMap<string, HTMLImageElement> | undefined,
  imageBySrc: ReadonlyMap<string, HTMLImageElement> | undefined,
): ReadonlyMap<string, HTMLImageElement> {
  if (imageBySrc && imageBySrc.size > 0) return imageBySrc;
  return imageByElementId ?? new Map();
}

/**
 * Collect GPU texture uploads for preview or export.
 * Video/image sources are external; text overlays are rasterized rendered textures.
 */
export function buildCompositorTextures(input: BuildCompositorTexturesInput): WasmTextureUpload[] {
  const textures: WasmTextureUpload[] = [];
  const {
    contentRect,
    currentTime,
    videoClip,
    canvasElements,
    videoFrame,
    videoFrameWidth,
    videoFrameHeight,
    imageByElementId,
    imageBySrc,
  } = input;

  if (videoClip && videoFrame && videoFrameReady(videoFrameWidth, videoFrameHeight)) {
    textures.push({
      kind: 'external',
      id: `video:${videoClip.id}`,
      source: videoFrame,
      width: videoFrameWidth,
      height: videoFrameHeight,
    });
  }

  const drawImages = imageLookupMaps(imageByElementId, imageBySrc);

  for (const element of canvasElements) {
    if (!isElementVisible(element, currentTime)) continue;

    const textureId = `canvas:${element.id}`;
    const isImage = element.type === 'logo' || element.type === 'image';
    const isText = element.type === 'text' || element.type === 'overlay';

    if (isImage) {
      const image = resolveImageForElement(element, imageByElementId, imageBySrc);
      if (!image || !image.complete || image.naturalWidth <= 0) continue;
      textures.push({
        kind: 'external',
        id: textureId,
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      continue;
    }

    if (!isText) continue;

    const layout = resolveCanvasElementPxLayout(element, currentTime, contentRect);
    const textureWidth = Math.max(1, Math.ceil(layout.width));
    const textureHeight = Math.max(1, Math.ceil(layout.boxHeight));

    textures.push({
      kind: 'rendered',
      id: textureId,
      contentHash: canvasElementTextureHash(element, currentTime, contentRect),
      width: textureWidth,
      height: textureHeight,
      draw: (ctx) => {
        drawCanvasElementUntransformed(ctx, element, currentTime, contentRect, drawImages);
      },
    });
  }

  return textures;
}

export function collectOverlayImageUrls(elements: CanvasElement[]): string[] {
  return [
    ...new Set(
      elements
        .filter((el) => (el.type === 'logo' || el.type === 'image') && el.src)
        .map((el) => el.src!),
    ),
  ];
}

export function collectOverlayFontFamilies(elements: CanvasElement[]): string[] {
  return [...new Set(elements.map((el) => el.fontFamily).filter(Boolean))] as string[];
}

/** @deprecated Use buildCompositorTextures */
export function buildPreviewTextures(
  input: Omit<BuildCompositorTexturesInput, 'videoFrame' | 'videoFrameWidth' | 'videoFrameHeight'> & {
    videoElement: HTMLVideoElement | null;
  },
): WasmTextureUpload[] {
  const video = input.videoElement;
  const ready = video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  return buildCompositorTextures({
    ...input,
    videoFrame: ready ? video : null,
    videoFrameWidth: ready ? video.videoWidth : 0,
    videoFrameHeight: ready ? video.videoHeight : 0,
  });
}
