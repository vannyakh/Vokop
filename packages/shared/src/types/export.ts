export type ExportResolution = 'original' | '2160p' | '1080p' | '720p' | '480p';
export type ExportQuality = 'ultra' | 'high' | 'medium' | 'low';
export type CaptionStyle = 'none' | 'standard' | 'highlight' | 'karaoke';
export type ExportFps = 24 | 30 | 60;

/** What kind of media the export produces. */
export type ExportType = 'video' | 'audio';

/** Output container. Video: mp4/webm. Audio: mp3/wav/aac. */
export type ExportFormat = 'mp4' | 'webm' | 'mp3' | 'wav' | 'aac';

/** Video codec — only meaningful when `exportType` is `'video'`. */
export type ExportCodec = 'h264' | 'h265' | 'vp9';

export interface ExportSettings {
  resolution: ExportResolution;
  quality: ExportQuality;
  fps: ExportFps;
  captionStyle: CaptionStyle;
  captionScale: number;
  includeOriginalAudio: boolean;
  includeVoiceover: boolean;
  /** Video or audio-only export. */
  exportType: ExportType;
  /** Output container/file format. */
  format: ExportFormat;
  /** Video codec (ignored for audio exports). */
  codec: ExportCodec;
  /** Append the branded watermark bumper when `false`. */
  removeWatermark: boolean;
  /** Export range start, in seconds. */
  rangeInSec: number;
  /** Export range end, in seconds. */
  rangeOutSec: number;
}
