/**
 * Shared canvas text measurement — adapted from OpenCut `@templates/OpenCut/apps/web/src/text/layout.ts`.
 */

import type { CanvasTextStyle } from '@vokop/shared';

export type TextCanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface TextBlockMeasurement {
  visualCenterOffset: number;
  height: number;
  maxWidth: number;
  lineCount: number;
}

const TEXT_DECORATION_THICKNESS_RATIO = 0.07;
const STRIKETHROUGH_VERTICAL_RATIO = 0.35;

export function setCanvasLetterSpacing(ctx: TextCanvasContext, letterSpacingPx: number): void {
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${letterSpacingPx}px`;
  }
}

export function measureTextBlock(input: {
  lineMetrics: TextMetrics[];
  lineHeightPx: number;
}): TextBlockMeasurement {
  let maxWidth = 0;
  for (const metrics of input.lineMetrics) {
    maxWidth = Math.max(maxWidth, metrics.width);
  }
  const lineCount = input.lineMetrics.length;
  const height = lineCount * input.lineHeightPx;
  const visualCenterOffset = ((lineCount - 1) * input.lineHeightPx) / 2;
  return { visualCenterOffset, height, maxWidth, lineCount };
}

export function wrapTextLines(ctx: TextCanvasContext, text: string, maxWidth: number): string[] {
  const normalized = text.trim().replace(/\r\n/g, '\n');
  const paragraphs = normalized.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      lines.push('');
      continue;
    }
    const words = trimmed.split(/\s+/);
    let line = words[0] ?? '';
    for (let i = 1; i < words.length; i += 1) {
      const next = `${line} ${words[i]}`;
      if (ctx.measureText(next).width <= maxWidth) {
        line = next;
      } else {
        lines.push(line);
        line = words[i]!;
      }
    }
    lines.push(line);
  }

  return lines.length > 0 ? lines : [''];
}

export function measureCanvasTextBlock(input: {
  ctx: TextCanvasContext;
  text: string;
  maxWidth: number;
  fontSizePx: number;
  style?: CanvasTextStyle;
}): TextBlockMeasurement {
  const lineHeightPx = input.fontSizePx * (input.style?.lineHeight ?? 1.35);
  const lines = wrapTextLines(input.ctx, input.text, Math.max(1, input.maxWidth - 8));
  const lineMetrics = lines.map((line) => input.ctx.measureText(line));
  return measureTextBlock({ lineMetrics, lineHeightPx });
}

export function drawTextDecoration(input: {
  ctx: TextCanvasContext;
  textDecoration: 'underline' | 'line-through' | undefined;
  lineWidth: number;
  lineY: number;
  metrics: TextMetrics;
  scaledFontSize: number;
  textAlign: CanvasTextAlign;
}): void {
  const { ctx, textDecoration, lineWidth, lineY, metrics, scaledFontSize, textAlign } = input;
  if (!textDecoration) return;

  const thickness = Math.max(1, scaledFontSize * TEXT_DECORATION_THICKNESS_RATIO);
  const ascent = metrics.actualBoundingBoxAscent ?? scaledFontSize * 0.8;
  const descent = metrics.actualBoundingBoxDescent ?? scaledFontSize * 0.2;

  let xStart = -lineWidth / 2;
  if (textAlign === 'left') xStart = 0;
  if (textAlign === 'right') xStart = -lineWidth;

  if (textDecoration === 'underline') {
    const underlineY = lineY + descent + thickness;
    ctx.fillRect(xStart, underlineY, lineWidth, thickness);
  }

  if (textDecoration === 'line-through') {
    const strikeY = lineY - (ascent - descent) * STRIKETHROUGH_VERTICAL_RATIO;
    ctx.fillRect(xStart, strikeY, lineWidth, thickness);
  }
}

export function roundTextBackgroundRect(
  ctx: TextCanvasContext,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
