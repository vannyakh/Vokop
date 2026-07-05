export type ProcessingStatus =
  | 'idle'
  | 'transcribing'
  | 'translating'
  | 'speaking'
  | 'analyzing'
  | 'error';

export type EditorTab = 'inspector' | 'translate' | 'transcript' | 'analysis';

export type StudioToolId =
  | 'media'
  | 'text'
  | 'audio'
  | 'voice'
  | 'captions'
  | 'effects'
  | 'transitions'
  | 'filters';

export interface Segment {
  time: number;
  /** Explicit end time when available (word-level / structured captions). */
  endTime?: number;
  speaker: string;
  text: string;
  raw: string;
  words?: import('./captions.js').CaptionWord[];
}

export interface Highlight {
  start: string;
  end: string;
  narration: string;
}

export interface VideoAnalysis {
  summary: string;
  highlights: Highlight[];
}
