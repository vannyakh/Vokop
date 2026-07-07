import { drawCssBackgroundInRect } from '@vokop/editor';
import type { CompositionBackground } from '@vokop/shared';
import {
  DEFAULT_COMPOSITION_BACKGROUND,
  blurLevelToPx,
  findBackgroundImagePreset,
} from '@vokop/shared';
import type { MediaAsset } from '@/features/studio/lib/mediaLibrary';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';

export function resolveClipBackground(
  clip: MediaClip | null | undefined,
  compositionBackground: CompositionBackground | undefined,
): CompositionBackground {
  const fallback = compositionBackground ?? DEFAULT_COMPOSITION_BACKGROUND;
  if (clip?.background && clip.background.mode !== 'none') {
    return clip.background;
  }
  return fallback;
}

/**
 * Preview background: project composition settings apply unless the active clip is
 * selected and has its own background (Background inspector tab).
 */
export function resolvePreviewBackground(
  activeClip: MediaClip | null | undefined,
  compositionBackground: CompositionBackground | undefined,
  selectedClipId: string | null | undefined,
): CompositionBackground {
  const fallback = compositionBackground ?? DEFAULT_COMPOSITION_BACKGROUND;
  if (
    activeClip &&
    selectedClipId === activeClip.id &&
    activeClip.background &&
    activeClip.background.mode !== 'none'
  ) {
    return activeClip.background;
  }
  return fallback;
}

/** Resolve the media URL backing the preview `<video>` (supports `<source>` + library clips). */
export function resolvePreviewVideoSourceUrl(
  video: HTMLVideoElement | null | undefined,
  videoUrl: string | null | undefined,
  clip: MediaClip | null | undefined,
  mediaAssets: MediaAsset[],
): string {
  if (clip?.mediaAssetId) {
    const asset = mediaAssets.find((item) => item.id === clip.mediaAssetId);
    if (asset?.url) return asset.url;
  }
  if (video?.currentSrc) return video.currentSrc;
  if (video?.src) return video.src;
  return videoUrl ?? '';
}

export function mergeCompositionBackground(
  current: CompositionBackground,
  patch: Partial<CompositionBackground>,
): CompositionBackground {
  return { ...current, ...patch };
}

export function isBackgroundActive(background: CompositionBackground): boolean {
  if (background.mode === 'none') return false;
  if (background.mode === 'color') return Boolean(background.color);
  if (background.mode === 'blur') return blurLevelToPx(background.blurLevel) > 0;
  if (background.mode === 'image') {
    return Boolean(background.imagePresetId || background.imageAssetId);
  }
  return false;
}

export function backgroundSummary(background: CompositionBackground): string {
  switch (background.mode) {
    case 'color':
      return background.color ?? 'Color';
    case 'blur':
      return background.blurLevel ? `Blur ${background.blurLevel}` : 'Blur';
    case 'image':
      if (background.imageAssetId) return 'Custom image';
      return findBackgroundImagePreset(background.imagePresetId)?.label ?? 'Image';
    default:
      return 'None';
  }
}

/**
 * Draw a CSS gradient/color background into a canvas rect. Uses the full CSS
 * gradient parser from `@vokop/editor` (linear/radial, angles, `to right`,
 * positioned stops); falls back to black when the CSS can't be painted.
 */
export function drawGradientBackground(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
  gradientCss: string,
): void {
  try {
    drawCssBackgroundInRect(ctx, rect, gradientCss);
  } catch {
    ctx.fillStyle = '#000000';
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }
}

export function collectBackgroundImageUrls(
  compositionBackground: CompositionBackground,
  videoClips: MediaClip[],
  mediaAssets: MediaAsset[],
): string[] {
  const assetIds = new Set<string>();
  if (compositionBackground.imageAssetId) {
    assetIds.add(compositionBackground.imageAssetId);
  }
  for (const clip of videoClips) {
    if (clip.background?.imageAssetId) assetIds.add(clip.background.imageAssetId);
  }
  return [...assetIds]
    .map((id) => mediaAssets.find((asset) => asset.id === id)?.url)
    .filter((url): url is string => Boolean(url));
}

export async function drawCompositionBackground(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
  background: CompositionBackground,
  mediaAssets: MediaAsset[],
  frameSource: CanvasImageSource | null,
  images: Map<string, HTMLImageElement>,
): Promise<void> {
  if (!isBackgroundActive(background)) return;

  if (background.mode === 'color') {
    ctx.fillStyle = background.color ?? '#000000';
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    return;
  }

  if (background.mode === 'blur' && frameSource) {
    const blurPx = blurLevelToPx(background.blurLevel);
    if (blurPx <= 0) return;
    ctx.save();
    ctx.filter = `blur(${blurPx}px)`;
    const scale = 1.12;
    const sw = rect.width * scale;
    const sh = rect.height * scale;
    const sx = rect.x - (sw - rect.width) / 2;
    const sy = rect.y - (sh - rect.height) / 2;
    ctx.drawImage(frameSource, sx, sy, sw, sh);
    ctx.restore();
    return;
  }

  if (background.mode === 'image') {
    if (background.imageAssetId) {
      const asset = mediaAssets.find((item) => item.id === background.imageAssetId);
      const img = asset?.url ? images.get(asset.url) : undefined;
      if (img) {
        ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height);
        return;
      }
    }
    const preset = findBackgroundImagePreset(background.imagePresetId);
    if (preset) {
      drawGradientBackground(ctx, rect, preset.gradient);
    }
  }
}
