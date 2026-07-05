import type { TranslationKey } from '@/i18n';

export const WHATS_NEW_VIDEO_STUDIO_PREVIEW_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

export const WHATS_NEW_DESIGN_STUDIO_PREVIEW_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4';

export const WHATS_NEW_SECTIONS: Array<{
  id: 'video-studio' | 'design-studio';
  navKey: TranslationKey;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  preview: 'studio' | 'design';
  videoUrl?: string;
}> = [
  {
    id: 'video-studio',
    navKey: 'whatsNewNavVideoStudio',
    titleKey: 'whatsNewVideoTitle',
    bodyKey: 'whatsNewVideoBody',
    preview: 'studio' as const,
    videoUrl: WHATS_NEW_VIDEO_STUDIO_PREVIEW_URL,
  },
  {
    id: 'design-studio',
    navKey: 'whatsNewNavDesignStudio',
    titleKey: 'whatsNewDesignTitle',
    bodyKey: 'whatsNewDesignBody',
    preview: 'design' as const,
    videoUrl: WHATS_NEW_DESIGN_STUDIO_PREVIEW_URL,
  },
];

export type WhatsNewSectionId = (typeof WHATS_NEW_SECTIONS)[number]['id'];
