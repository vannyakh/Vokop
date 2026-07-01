/** Structured segment returned by Gemini for timeline + canvas sync. */
export interface EditorSegment {
  startSec: number;
  endSec?: number;
  speaker: string;
  text: string;
}

export interface TranscriptionResult {
  detectedLanguage: string;
  segments: EditorSegment[];
  /** Legacy `[MM:SS] Speaker: text` string used by the store + parser. */
  transcript: string;
}

export interface TranslationResult {
  segments: EditorSegment[];
  /** Formatted transcript string for Zustand + timeline clips. */
  translatedText: string;
}

export interface EditorCaptionLimits {
  maxChars: number;
  maxLines: number;
  hint: string;
}
