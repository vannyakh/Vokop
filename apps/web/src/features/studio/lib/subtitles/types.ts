/** Subtitle import types — adapted from OpenCut `@templates/OpenCut/apps/web/src/subtitles`. */

export interface SubtitlePlacementStyle {
  verticalAlign?: 'top' | 'middle' | 'bottom';
  marginLeftRatio?: number;
  marginRightRatio?: number;
  marginVerticalRatio?: number;
}

export interface SubtitleStyleOverrides {
  fontSize?: number;
  fontSizeRatioOfPlayHeight?: number;
  fontFamily?: string;
  color?: string;
  background?: {
    enabled?: boolean;
    color?: string;
  };
  textAlign?: 'left' | 'center' | 'right';
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  letterSpacing?: number;
  lineHeight?: number;
  placement?: SubtitlePlacementStyle;
}

export interface SubtitleCue {
  text: string;
  startTime: number;
  duration: number;
  style?: SubtitleStyleOverrides;
}

export interface ParseSubtitleResult {
  captions: SubtitleCue[];
  skippedCueCount: number;
  warnings: string[];
}
