/** Word-level timing within a caption segment (Whisper/STT style). */
export interface CaptionWord {
  text: string;
  startSec: number;
  endSec: number;
}

/** Optional styling from ASS/SRT import — applied when promoting to canvas text. */
export interface CaptionSegmentStyle {
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
  placement?: {
    verticalAlign?: 'top' | 'middle' | 'bottom';
    marginLeftRatio?: number;
    marginRightRatio?: number;
    marginVerticalRatio?: number;
  };
}

/** Structured caption segment with optional per-word timing. */
export interface CaptionSegment {
  startSec: number;
  endSec: number;
  speaker: string;
  text: string;
  words?: CaptionWord[];
  style?: CaptionSegmentStyle;
}

export interface CaptionTracks {
  transcript: CaptionSegment[];
  translation: CaptionSegment[];
}
