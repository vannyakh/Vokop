/** Best codec/container the current browser supports, tried in preference order */
export function detectBestVideoCodec(): string {
  const candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1.42001F',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

export type ExportResolution = 'original' | '2160p' | '1080p' | '720p' | '480p';
export type ExportQuality = 'ultra' | 'high' | 'medium' | 'low';
export type CaptionStyle = 'none' | 'standard' | 'highlight' | 'karaoke';

export interface ExportSettings {
  resolution: ExportResolution;
  quality: ExportQuality;
  fps: 24 | 30 | 60;
  captionStyle: CaptionStyle;
  captionScale: number;
  includeOriginalAudio: boolean;
  includeVoiceover: boolean;
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  resolution: 'original',
  quality: 'high',
  fps: 30,
  captionStyle: 'standard',
  captionScale: 1,
  includeOriginalAudio: true,
  includeVoiceover: true,
};

const QUALITY_BITRATE: Record<ExportQuality, number> = {
  ultra:  16_000_000,
  high:    8_000_000,
  medium:  4_000_000,
  low:     2_000_000,
};

const RESOLUTION_HEIGHT: Record<ExportResolution, number | null> = {
  original: null,
  '2160p': 2160,
  '1080p': 1080,
  '720p':  720,
  '480p':  480,
};

export function resolveExportDimensions(
  videoWidth: number,
  videoHeight: number,
  resolution: ExportResolution,
): { width: number; height: number } {
  const targetH = RESOLUTION_HEIGHT[resolution];
  if (!targetH || targetH >= videoHeight) return { width: videoWidth, height: videoHeight };
  const scale = targetH / videoHeight;
  return {
    width: Math.round(videoWidth * scale),
    height: targetH,
  };
}

export function resolveExportBitrate(quality: ExportQuality): number {
  return QUALITY_BITRATE[quality];
}
