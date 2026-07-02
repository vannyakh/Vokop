export type ExportResolution = 'original' | '2160p' | '1080p' | '720p' | '480p';
export type ExportQuality = 'ultra' | 'high' | 'medium' | 'low';
export type CaptionStyle = 'none' | 'standard' | 'highlight' | 'karaoke';
export type ExportFps = 24 | 30 | 60;

export interface ExportSettings {
  resolution: ExportResolution;
  quality: ExportQuality;
  fps: ExportFps;
  captionStyle: CaptionStyle;
  captionScale: number;
  includeOriginalAudio: boolean;
  includeVoiceover: boolean;
}
