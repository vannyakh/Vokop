import type { LucideIcon } from 'lucide-react';
import {
  AudioWaveform,
  Clapperboard,
  Grip,
  Layers,
  MessageSquareText,
  Ratio,
  Scan,
  Timer,
} from 'lucide-react';
import type { TranslationKey } from '@/i18n';

const CDN = 'https://sf16-web-tos-buz.capcutcdn-us.com/obj/capcut-web-buz-tx';

export type ToolBadge = 'free' | 'new' | 'hot';

export interface ToolCatalogMedia {
  cover: string;
  video?: string;
}

export interface ToolCatalogItem {
  id: string;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  badges: ToolBadge[];
  icon: LucideIcon;
  media: ToolCatalogMedia;
}

export interface ToolCatalogCategory {
  id: string;
  labelKey: TranslationKey;
  tools: ToolCatalogItem[];
}

export const TOOLS_CATALOG: ToolCatalogCategory[] = [
  {
    id: 'trending',
    labelKey: 'toolsCatTrending',
    tools: [
      {
        id: 'text-to-speech',
        titleKey: 'toolTextToSpeechTitle',
        bodyKey: 'toolTextToSpeechBody',
        badges: ['free', 'new'],
        icon: MessageSquareText,
        media: {
          cover: `${CDN}/common/videos/text_to_speech_tools_cover_2.png`,
          video: `${CDN}/common/videos/text_to_speech_tools_video_2.mp4`,
        },
      },
      {
        id: 'voice-changer',
        titleKey: 'toolVoiceChangerTitle',
        bodyKey: 'toolVoiceChangerBody',
        badges: ['free', 'new'],
        icon: AudioWaveform,
        media: {
          cover: `${CDN}/common/audios/voice_changer_tools_cover.jpeg`,
          video: `${CDN}/common/audios/voice_changer_tools_cover.mp4`,
        },
      },
      {
        id: 'batch-edit',
        titleKey: 'toolBatchEditTitle',
        bodyKey: 'toolBatchEditBody',
        badges: ['hot', 'new'],
        icon: Layers,
        media: {
          cover: `${CDN}/ies/lvweb/platform_online/static/image/batch_tool.6765820192.jpeg`,
          video: `${CDN}/common/videos/batch_tool.mp4`,
        },
      },
    ],
  },
  {
    id: 'create-with-ai',
    labelKey: 'toolsCatCreateWithAi',
    tools: [
      {
        id: 'video-studio',
        titleKey: 'toolVideoStudioTitle',
        bodyKey: 'toolVideoStudioBody',
        badges: ['free', 'new'],
        icon: Clapperboard,
        media: {
          cover: `${CDN}/ies/lvweb/platform_online/static/image/ai_canvas_cover.0687c09ea5.png`,
        },
      },
    ],
  },
  {
    id: 'for-videos',
    labelKey: 'toolsCatForVideos',
    tools: [
      {
        id: 'remove-background',
        titleKey: 'toolRemoveBgTitle',
        bodyKey: 'toolRemoveBgBody',
        badges: ['free', 'new'],
        icon: Scan,
        media: {
          cover: `${CDN}/ies/lvweb/platform_online/static/image/remove_bg_cover.dc65866323.jpg`,
          video: `${CDN}/common/videos/tool_remove_bg.mp4`,
        },
      },
      {
        id: 'resize-video',
        titleKey: 'toolResizeVideoTitle',
        bodyKey: 'toolResizeVideoBody',
        badges: ['free', 'new'],
        icon: Ratio,
        media: {
          cover: `${CDN}/ies/lvweb/platform_online/static/image/resize_video_cover.288e8a9a62.jpg`,
          video: `${CDN}/common/videos/tool_resize_video.mp4`,
        },
      },
      {
        id: 'video-stabilization',
        titleKey: 'toolVideoStabilizationTitle',
        bodyKey: 'toolVideoStabilizationBody',
        badges: ['free', 'new'],
        icon: Grip,
        media: {
          cover: `${CDN}/ies/lvweb/platform_online/static/image/video_stabilization_cover.f798849fd9.jpg`,
          video: `${CDN}/common/videos/tool_video_stabilization.mp4`,
        },
      },
      {
        id: 'super-slow-motion',
        titleKey: 'toolSuperSlowMotionTitle',
        bodyKey: 'toolSuperSlowMotionBody',
        badges: ['free', 'new'],
        icon: Timer,
        media: {
          cover: `${CDN}/ies/lvweb/platform_online/static/image/super_slow_motion_cover.13ce8330a5.jpg`,
          video: `${CDN}/common/videos/tool_super_slow_motion.mp4`,
        },
      },
    ],
  },
  {
    id: 'for-audio',
    labelKey: 'toolsCatForAudio',
    tools: [
      {
        id: 'audio-text-to-speech',
        titleKey: 'toolTextToSpeechTitle',
        bodyKey: 'toolTextToSpeechBody',
        badges: ['free', 'new'],
        icon: MessageSquareText,
        media: {
          cover: `${CDN}/common/videos/text_to_speech_tools_cover_2.png`,
          video: `${CDN}/common/videos/text_to_speech_tools_video_2.mp4`,
        },
      },
      {
        id: 'audio-voice-changer',
        titleKey: 'toolVoiceChangerTitle',
        bodyKey: 'toolVoiceChangerBody',
        badges: ['free', 'new'],
        icon: AudioWaveform,
        media: {
          cover: `${CDN}/common/audios/voice_changer_tools_cover.jpeg`,
          video: `${CDN}/common/audios/voice_changer_tools_cover.mp4`,
        },
      },
    ],
  },
];

export function toolsCatalogGridClass(count: number): string {
  if (count >= 3) return 'tools-catalog-grid tools-catalog-grid--3';
  if (count === 2) return 'tools-catalog-grid tools-catalog-grid--2';
  return 'tools-catalog-grid tools-catalog-grid--1';
}
