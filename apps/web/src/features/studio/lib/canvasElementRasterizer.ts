import { getEffectProps } from '@/features/studio/constants/textEffects';
import { toPxBox, toPxFontSize, type CanvasRect } from '@/features/studio/lib/canvasCoords';
import { sampleElementAtTime } from '@/features/studio/lib/keyframeUtils';
import {
  drawTextDecoration,
  measureCanvasTextBlock,
  roundTextBackgroundRect,
  setCanvasLetterSpacing,
  wrapTextLines,
  type TextCanvasContext,
} from '@/features/studio/lib/textLayout';
import type { CanvasElement } from '@/types/canvas';

export interface CanvasElementPxLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  boxHeight: number;
  rotation: number;
  opacity: number;
}

let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureCtx) return measureCtx;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = 4096;
  measureCtx = canvas.getContext('2d');
  return measureCtx;
}

function measureTextBoxHeight(
  element: CanvasElement,
  contentRect: CanvasRect,
  displayWidth: number,
): number {
  const fontSizePx = toPxFontSize(element.fontSize ?? 0, contentRect);
  const ctx = getMeasureContext();
  if (!ctx) return fontSizePx * 1.6;

  const style = element.textStyle;
  const effectProps = getEffectProps(element.textEffect);
  const displayText =
    style?.textTransform === 'uppercase' ? element.text.toUpperCase() : element.text;
  const resolvedFontFamily = element.fontFamily
    ? `${element.fontFamily}, "Noto Sans", "Inter", sans-serif`
    : '"Khmer OS Battambang", "Noto Sans", "Inter", sans-serif';
  const fontWeight = style?.fontWeight === 'bold' ? 'bold' : 'normal';
  const fontStyle = style?.fontStyle === 'italic' ? 'italic' : 'normal';
  ctx.font = `${fontStyle} ${fontWeight} ${fontSizePx}px ${resolvedFontFamily}`;
  setCanvasLetterSpacing(ctx, style?.letterSpacing ?? 0);

  const block = measureCanvasTextBlock({
    ctx,
    text: displayText,
    maxWidth: Math.max(1, displayWidth - 8),
    fontSizePx,
    style,
  });
  return Math.max(fontSizePx * 1.6, block.height + 8);
}

export function resolveCanvasElementPxLayout(
  element: CanvasElement,
  timelineTime: number,
  contentRect: CanvasRect,
): CanvasElementPxLayout {
  const animated = sampleElementAtTime(element, timelineTime);
  const display = { ...animated, ...toPxBox(animated, contentRect) };
  const isImage = element.type === 'logo' || element.type === 'image';
  const boxHeight = isImage
    ? display.height
    : measureTextBoxHeight(element, contentRect, display.width);
  return {
    x: display.x,
    y: display.y,
    width: display.width,
    height: display.height,
    boxHeight,
    rotation: display.rotation ?? 0,
    opacity: display.opacity ?? 1,
  };
}

/** Stable cache key for WASM rendered textures (text / rasterized overlays). */
export function canvasElementTextureHash(
  element: CanvasElement,
  timelineTime: number,
  contentRect: CanvasRect,
): string {
  const layout = resolveCanvasElementPxLayout(element, timelineTime, contentRect);
  const style = element.textStyle;
  return [
    element.id,
    element.type,
    element.text,
    element.src ?? '',
    element.fontFamily ?? '',
    element.textEffect ?? '',
    element.flipX ? '1' : '0',
    element.flipY ? '1' : '0',
    layout.x.toFixed(2),
    layout.y.toFixed(2),
    layout.width.toFixed(2),
    layout.boxHeight.toFixed(2),
    layout.rotation.toFixed(2),
    layout.opacity.toFixed(3),
    element.fontSize?.toFixed(5) ?? '',
    style?.fill ?? '',
    style?.stroke ?? '',
    style?.background ?? '',
    style?.align ?? '',
    style?.fontWeight ?? '',
    style?.fontStyle ?? '',
    style?.textTransform ?? '',
    timelineTime.toFixed(4),
    contentRect.width.toFixed(1),
    contentRect.height.toFixed(1),
  ].join('|');
}

/** Draw element pixels at (0,0) for WASM texture upload — transform/opacity applied by compositor. */
export function drawCanvasElementUntransformed(
  ctx: TextCanvasContext,
  element: CanvasElement,
  timelineTime: number,
  contentRect: CanvasRect,
  images: ReadonlyMap<string, HTMLImageElement>,
): void {
  const layout = resolveCanvasElementPxLayout(element, timelineTime, contentRect);
  const isText = element.type === 'text' || element.type === 'overlay';
  const isImage = element.type === 'logo' || element.type === 'image';
  const fontSizePx = toPxFontSize(element.fontSize ?? 0, contentRect);

  ctx.save();
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  if (isImage) {
    const img = element.src ? images.get(element.src) : undefined;
    if (img) {
      ctx.drawImage(img, 0, 0, layout.width, layout.height);
    }
    ctx.restore();
    return;
  }

  if (!isText) {
    ctx.restore();
    return;
  }

  const style = element.textStyle;
  const effectProps = getEffectProps(element.textEffect);
  const displayText =
    style?.textTransform === 'uppercase' ? element.text.toUpperCase() : element.text;
  const resolvedFill = effectProps.fill ?? style?.fill ?? '#ffffff';
  const resolvedFontFamily = element.fontFamily
    ? `${element.fontFamily}, "Noto Sans", "Inter", sans-serif`
    : '"Khmer OS Battambang", "Noto Sans", "Inter", sans-serif';
  const fontWeight = style?.fontWeight === 'bold' ? 'bold' : 'normal';
  const fontStyle = style?.fontStyle === 'italic' ? 'italic' : 'normal';
  ctx.font = `${fontStyle} ${fontWeight} ${fontSizePx}px ${resolvedFontFamily}`;
  ctx.textBaseline = 'top';
  setCanvasLetterSpacing(ctx, style?.letterSpacing ?? 0);

  if (style?.background) {
    ctx.fillStyle = style.background;
    roundTextBackgroundRect(ctx, 0, 0, layout.width, layout.boxHeight, style.backgroundRadius ?? 8);
    ctx.fill();
  }

  const shadowEnabled = effectProps.shadowEnabled ?? Boolean(style?.shadowColor);
  if (shadowEnabled) {
    ctx.shadowColor = effectProps.shadowColor ?? style?.shadowColor ?? 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = effectProps.shadowBlur ?? style?.shadowBlur ?? 8;
    ctx.shadowOffsetX = effectProps.shadowOffsetX ?? style?.shadowDistance ?? 2;
    ctx.shadowOffsetY = effectProps.shadowOffsetY ?? (style?.shadowDistance ? 0 : 2);
  }

  const align = style?.align ?? 'center';
  ctx.textAlign = align;
  const textX = align === 'left' ? 4 : align === 'right' ? layout.width - 4 : layout.width / 2;
  const lineHeight = fontSizePx * (style?.lineHeight ?? 1.35);
  const lines = wrapTextLines(ctx, displayText, layout.width - 8);

  const stroke = effectProps.stroke ?? style?.stroke;
  const strokeWidth = effectProps.strokeWidth ?? style?.strokeWidth ?? 0;

  lines.forEach((line, index) => {
    const y = 4 + index * lineHeight;
    const metrics = ctx.measureText(line);
    if (stroke && strokeWidth > 0) {
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = stroke;
      ctx.strokeText(line, textX, y);
    }
    ctx.fillStyle = resolvedFill;
    ctx.fillText(line, textX, y);
    if (style?.underline) {
      drawTextDecoration({
        ctx,
        textDecoration: 'underline',
        lineWidth: metrics.width,
        lineY: y,
        metrics,
        scaledFontSize: fontSizePx,
        textAlign: align,
      });
    }
  });

  ctx.restore();
}

/** Draw a canvas element with full transform (2D export / fallback preview). */
export function drawCanvasElement(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  timelineTime: number,
  contentRect: CanvasRect,
  images: ReadonlyMap<string, HTMLImageElement>,
): void {
  const layout = resolveCanvasElementPxLayout(element, timelineTime, contentRect);
  const isImage = element.type === 'logo' || element.type === 'image';

  ctx.save();
  ctx.globalAlpha = layout.opacity;
  ctx.translate(layout.x + layout.width / 2, layout.y + layout.boxHeight / 2);
  ctx.scale(element.flipX ? -1 : 1, element.flipY ? -1 : 1);
  ctx.rotate((layout.rotation * Math.PI) / 180);
  ctx.translate(-layout.width / 2, -layout.boxHeight / 2);

  if (isImage) {
    const img = element.src ? images.get(element.src) : undefined;
    if (img) {
      ctx.drawImage(img, 0, 0, layout.width, layout.height);
    }
    ctx.restore();
    return;
  }

  drawCanvasElementUntransformed(ctx, element, timelineTime, contentRect, images);
  ctx.restore();
}
