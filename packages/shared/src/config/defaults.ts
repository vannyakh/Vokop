import type { UserPreferences } from '../types/preferences.js';
import type { ExportSettings } from '../types/export.js';

export const DEFAULT_PREFERENCES: UserPreferences = {
  uiLanguage: 'en',
  colorTheme: 'dark',
};

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  resolution: 'original',
  quality: 'high',
  fps: 30,
  captionStyle: 'standard',
  captionScale: 1,
  includeOriginalAudio: true,
  includeVoiceover: true,
};

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
