/**
 * Promote caption segments to editable canvas text elements.
 * Adapted from OpenCut `@templates/OpenCut/apps/web/src/subtitles/build-subtitle-text-element.ts`.
 */

import type { CaptionSegment, CanvasElement } from '@vokop/shared';
import { frameReferenceSize, toFractionBox, toFractionFontSize } from '@/features/studio/lib/canvasCoords';
import {
  measureCanvasTextBlock,
  setCanvasLetterSpacing,
  wrapTextLines,
} from '@/features/studio/lib/textLayout';

const SUBTITLE_MAX_WIDTH_RATIO = 0.8;
const SUBTITLE_BOTTOM_MARGIN_RATIO = 0.05;
const DEFAULT_FONT_SIZE_PX = 22;

function createMeasurementContext(): CanvasRenderingContext2D | null {
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = 4096;
  return canvas.getContext('2d');
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
  const fontSizePx = DEFAULT_FONT_SIZE_PX;
  const fontFamily = '"Khmer OS Battambang", "Noto Sans", "Inter", sans-serif';
  const fontString = `bold ${fontSizePx}px ${fontFamily}`;
  const maxTextWidth = ref.width * SUBTITLE_MAX_WIDTH_RATIO;
  const marginBottom = ref.height * SUBTITLE_BOTTOM_MARGIN_RATIO;

  if (ctx) {
    ctx.font = fontString;
    setCanvasLetterSpacing(ctx, 0);
  }

  return input.segments.map((segment, index) => {
    const textSource = segment.text.trim();
    let text = textSource;
    let boxWidthPx = maxTextWidth;
    let boxHeightPx = fontSizePx * 1.6;

    if (ctx) {
      text = wrapTextLines(ctx, textSource, maxTextWidth).join('\n');
      const block = measureCanvasTextBlock({
        ctx,
        text,
        maxWidth: maxTextWidth,
        fontSizePx,
        style: { lineHeight: 1.35, align: 'center' },
      });
      boxWidthPx = Math.max(maxTextWidth * 0.4, block.maxWidth + 8);
      boxHeightPx = Math.max(fontSizePx * 1.6, block.height + 8);
    }

    const pxBox = {
      x: (ref.width - boxWidthPx) / 2,
      y: ref.height - marginBottom - boxHeightPx,
      width: boxWidthPx,
      height: boxHeightPx,
    };
    const fractionBox = toFractionBox(pxBox, refRect);

    return {
      id: `caption-${input.segmentType}-${index}-${Date.now()}`,
      type: 'text' as const,
      text,
      ...fractionBox,
      fontSize: toFractionFontSize(fontSizePx, refRect),
      rotation: 0,
      opacity: 1,
      startTime: segment.startSec,
      endTime: segment.endSec,
      segmentIndex: index,
      segmentType: input.segmentType,
      trackId: input.trackId ?? 'text',
      textStyle: {
        fill: '#ffffff',
        fontWeight: 'bold' as const,
        align: 'center' as const,
        lineHeight: 1.35,
        stroke: '#000000',
        strokeWidth: 2,
      },
    };
  });
}
