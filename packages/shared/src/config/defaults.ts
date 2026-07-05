import type { UserPreferences } from '../types/preferences.js';
import type { ExportCodec, ExportQuality, ExportResolution, ExportSettings } from '../types/export.js';

export const DEFAULT_PREFERENCES: UserPreferences = {
  uiLanguage: 'en',
  colorTheme: 'dark',
};

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  resolution: '1080p',
  quality: 'high',
  fps: 30,
  captionStyle: 'standard',
  captionScale: 1,
  includeOriginalAudio: true,
  includeVoiceover: true,
  exportType: 'video',
  format: 'mp4',
  codec: 'h264',
  removeWatermark: false,
  /** 0 is a sentinel meaning "use full timeline duration" until the modal resolves it. */
  rangeInSec: 0,
  rangeOutSec: 0,
};

/** Quality preset -> resolution, kept in sync with the Export Video modal's single Quality dropdown. */
export const EXPORT_QUALITY_RESOLUTION: Record<ExportQuality, ExportResolution> = {
  ultra: '2160p',
  high: '1080p',
  medium: '720p',
  low: '480p',
};

/** Codec choices available per output format. */
export const EXPORT_FORMAT_CODECS: Record<'mp4' | 'webm', ExportCodec[]> = {
  mp4: ['h264', 'h265'],
  webm: ['vp9'],
};

/** Audio-only export formats (no codec dropdown — codec is implied by format). */
export const EXPORT_AUDIO_FORMATS = ['mp3', 'wav', 'aac'] as const;

export const DEFAULT_VOICE = 'Kore';

export const EXPORT_FPS_OPTIONS = [24, 30, 60] as const;

export const EXPORT_QUALITY_BITRATE = {
  ultra: 16_000_000,
  high: 8_000_000,
  medium: 4_000_000,
  low: 2_000_000,
} as const;

export const EXPORT_RESOLUTION_HEIGHT = {
  original: null,
  '2160p': 2160,
  '1080p': 1080,
  '720p': 720,
  '480p': 480,
} as const;
