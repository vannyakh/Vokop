import type { TranslationKey } from '@/i18n';

export const WHATS_NEW_VIDEO_STUDIO_PREVIEW_URL =
  'https://p16-vimo-useast5.capcutcdn-us.com/tos-useast5-i-f0k6wfgiqi-tx/985be9fcba31464587726d4f765f0777';

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
  },
] ;

export type WhatsNewSectionId = (typeof WHATS_NEW_SECTIONS)[number]['id'];
