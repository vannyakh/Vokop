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
  speaker: string;
  text: string;
  raw: string;
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
