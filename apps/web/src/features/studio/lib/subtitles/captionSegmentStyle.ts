import type { CaptionSegmentStyle } from '@vokop/shared';
import type { SubtitleStyleOverrides } from '@/features/studio/lib/subtitles/types';
import { normalizeSubtitleFontFamily } from '@/features/studio/fonts/fontStack';

export function toCaptionSegmentStyle(
  style?: SubtitleStyleOverrides,
): CaptionSegmentStyle | undefined {
  if (!style) return undefined;
  return {
    fontSize: style.fontSize,
    fontSizeRatioOfPlayHeight: style.fontSizeRatioOfPlayHeight,
    fontFamily: normalizeSubtitleFontFamily(style.fontFamily),
    color: style.color,
    background: style.background,
    textAlign: style.textAlign,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    textDecoration: style.textDecoration,
    letterSpacing: style.letterSpacing,
    lineHeight: style.lineHeight,
    placement: style.placement,
  };
}
