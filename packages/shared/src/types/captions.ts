/** Word-level timing within a caption segment (Whisper/STT style). */
export interface CaptionWord {
  text: string;
  startSec: number;
  endSec: number;
}

/** Structured caption segment with optional per-word timing. */
export interface CaptionSegment {
  startSec: number;
  endSec: number;
  speaker: string;
  text: string;
  words?: CaptionWord[];
}

export interface CaptionTracks {
  transcript: CaptionSegment[];
  translation: CaptionSegment[];
}
