export type ProcessingStatus =
  | 'idle'
  | 'transcribing'
  | 'translating'
  | 'speaking'
  | 'analyzing'
  | 'error';

export type EditorTab = 'translate' | 'transcript' | 'analysis';

export type StudioToolId =
  | 'media'
  | 'text'
  | 'audio'
  | 'voice'
  | 'captions'
  | 'effects'
  | 'transitions'
  | 'filters';

export type AspectRatioId =
  | 'original'
  | '16:9'
  | '4:3'
  | '2:1'
  | '9:16'
  | '1:1'
  | '3:4';

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

export interface LanguageOption {
  code: string;
  name: string;
}

export interface VoiceOption {
  id: string;
  label: string;
}
