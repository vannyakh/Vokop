/**
 * Promote caption segments to editable canvas text elements.
 * Adapted from OpenCut `@templates/OpenCut/apps/web/src/subtitles/build-subtitle-text-element.ts`.
 */

import type { CaptionSegment, CaptionSegmentStyle, CanvasElement } from '@vokop/shared';
import { frameReferenceSize, toFractionBox, toFractionFontSize } from '@/features/studio/lib/canvasCoords';
import {
  measureCanvasTextBlock,
  setCanvasLetterSpacing,
  wrapTextLines,
} from '@/features/studio/lib/textLayout';
import { normalizeSubtitleFontFamily, resolveStudioFontStack } from '@/features/studio/fonts/fontStack';
import { loadStudioFont } from '@/features/studio/lib/fontLoader';

const SUBTITLE_MAX_WIDTH_RATIO = 0.8;
const SUBTITLE_BOTTOM_MARGIN_RATIO = 0.05;
const DEFAULT_FONT_FAMILY = 'Poppins';

const DEFAULT_FONT_SIZE_PX = 22;

function createMeasurementContext(): CanvasRenderingContext2D | null {
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = 4096;
  return canvas.getContext('2d');
}

function resolveFontSizePx(style: CaptionSegmentStyle | undefined, refHeight: number): number {
  if (style?.fontSizeRatioOfPlayHeight && style.fontSizeRatioOfPlayHeight > 0) {
    return Math.max(12, style.fontSizeRatioOfPlayHeight * refHeight);
  }
  if (style?.fontSize && style.fontSize > 0) return style.fontSize;
  return DEFAULT_FONT_SIZE_PX;
}

function resolveSubtitleBox(
  ref: { width: number; height: number },
  style: CaptionSegmentStyle | undefined,
  boxWidthPx: number,
  boxHeightPx: number,
): { x: number; y: number; width: number; height: number } {
  const placement = style?.placement;
  const marginV = (placement?.marginVerticalRatio ?? SUBTITLE_BOTTOM_MARGIN_RATIO) * ref.height;
  const marginL = (placement?.marginLeftRatio ?? 0) * ref.width;
  const marginR = (placement?.marginRightRatio ?? 0) * ref.width;
  const verticalAlign = placement?.verticalAlign ?? 'bottom';
  const textAlign = style?.textAlign ?? 'center';

  let x = (ref.width - boxWidthPx) / 2;
  if (textAlign === 'left') x = marginL;
  else if (textAlign === 'right') x = ref.width - marginR - boxWidthPx;

  let y: number;
  if (verticalAlign === 'top') y = marginV;
  else if (verticalAlign === 'middle') y = (ref.height - boxHeightPx) / 2;
  else y = ref.height - marginV - boxHeightPx;

  return { x, y, width: boxWidthPx, height: boxHeightPx };
}

export interface BuildCaptionCanvasElementsInput {
  segments: CaptionSegment[];
  segmentType: 'transcript' | 'translation';
  videoWidth: number;
  videoHeight: number;
  trackId?: string;
}

export function buildCaptionCanvasElements(input: BuildCaptionCanvasElementsInput): CanvasElement[] {
  const ref = frameReferenceSize(input.videoWidth, input.videoHeight);
  const refRect = { x: 0, y: 0, width: ref.width, height: ref.height };
  const ctx = createMeasurementContext();
  const maxTextWidth = ref.width * SUBTITLE_MAX_WIDTH_RATIO;

  const elements = input.segments.map((segment, index) => {
    const style = segment.style;
    const fontSizePx = resolveFontSizePx(style, ref.height);
    const fontFamily = normalizeSubtitleFontFamily(style?.fontFamily) ?? DEFAULT_FONT_FAMILY;
    const fontWeight = style?.fontWeight ?? 'bold';
    const fontStack = resolveStudioFontStack(fontFamily);
    const fontString = `${fontWeight === 'bold' ? 'bold' : 'normal'} ${fontSizePx}px ${fontStack}`;
    const lineHeight = style?.lineHeight ?? 1.35;
    const textAlign = style?.textAlign ?? 'center';
    const letterSpacing = style?.letterSpacing ?? 0;

    const textSource = segment.text.trim();
    let text = textSource;
    let boxWidthPx = maxTextWidth;
    let boxHeightPx = fontSizePx * 1.6;

    if (ctx) {
      ctx.font = fontString;
      setCanvasLetterSpacing(ctx, letterSpacing);
      text = wrapTextLines(ctx, textSource, maxTextWidth).join('\n');
      const block = measureCanvasTextBlock({
        ctx,
        text,
        maxWidth: maxTextWidth,
        fontSizePx,
        style: { lineHeight, align: textAlign },
      });
      boxWidthPx = Math.max(maxTextWidth * 0.4, block.maxWidth + 8);
      boxHeightPx = Math.max(fontSizePx * 1.6, block.height + 8);
    }

    const pxBox = resolveSubtitleBox(ref, style, boxWidthPx, boxHeightPx);
    const fractionBox = toFractionBox(pxBox, refRect);

    const fill = style?.color ?? '#ffffff';
    const backgroundEnabled = style?.background?.enabled && style.background.color;
    const underline = style?.textDecoration === 'underline';

    return {
      id: `caption-${input.segmentType}-${index}-${Date.now()}`,
      type: 'text' as const,
      text,
      ...fractionBox,
      fontSize: toFractionFontSize(fontSizePx, refRect),
      fontFamily,
      rotation: 0,
      opacity: 1,
      startTime: segment.startSec,
      endTime: segment.endSec,
      segmentIndex: index,
      segmentType: input.segmentType,
      trackId: input.trackId ?? 'text',
      textStyle: {
        fill,
        fontWeight,
        fontStyle: style?.fontStyle ?? 'normal',
        underline,
        align: textAlign,
        lineHeight,
        letterSpacing,
        stroke: '#000000',
        strokeWidth: 2,
        ...(backgroundEnabled ? { background: style!.background!.color } : {}),
      },
    };
  });

  const families = [...new Set(elements.map((el) => el.fontFamily).filter(Boolean))] as string[];
  for (const family of families) {
    void loadStudioFont(family, { fontWeight: 'bold' });
  }

  return elements;
}
