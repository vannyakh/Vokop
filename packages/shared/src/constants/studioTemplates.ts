import type { StudioTemplate } from '../types/studioTemplate.js';

export const STUDIO_TEMPLATE_CATEGORIES = [
  { id: 'shorts', label: 'Shorts & Reels' },
  { id: 'tutorial', label: 'Tutorial' },
  { id: 'social', label: 'Social' },
] as const;

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  {
    id: 'reels-hook',
    name: 'Reels hook',
    description: 'Bold title + bottom caption layout for vertical short-form video.',
    aspectRatio: '9:16',
    durationSec: 15,
    categories: ['shorts'],
    slots: [
      { id: 'primary-video', kind: 'video', label: 'Main video', required: true },
    ],
    blueprint: {
      videoClips: [
        {
          blueprintId: 'main-video',
          slotId: 'primary-video',
          start: 0,
          duration: 15,
          sourceStart: 0,
          name: 'Main video',
        },
      ],
      audioClips: [],
      canvasElements: [
        {
          type: 'text',
          text: 'HOOK TITLE',
          templateId: 'neon-pop',
          verticalAlign: 'top',
          fontSize: 32,
          startTime: 0,
          endTime: 4,
          trackId: 'text',
          textStyle: {
            fill: '#54D6C9',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: 2,
            stroke: '#0B0A08',
            strokeWidth: 2,
            shadowColor: 'rgba(84,214,201,0.6)',
            shadowBlur: 16,
          },
        },
        {
          type: 'text',
          text: 'Your caption here',
          templateId: 'clean-caption',
          verticalAlign: 'bottom',
          fontSize: 22,
          startTime: 0,
          endTime: 15,
          trackId: 'text',
          textStyle: {
            fill: '#ffffff',
            fontWeight: 'normal',
            background: 'rgba(0,0,0,0.55)',
            align: 'center',
          },
        },
      ],
    },
  },
  {
    id: 'tutorial-intro',
    name: 'Tutorial intro',
    description: 'Cinematic title card for widescreen explainers and how-to videos.',
    aspectRatio: '16:9',
    durationSec: 30,
    categories: ['tutorial'],
    slots: [
      { id: 'primary-video', kind: 'video', label: 'Main video', required: true },
    ],
    blueprint: {
      videoClips: [
        {
          blueprintId: 'main-video',
          slotId: 'primary-video',
          start: 0,
          duration: 30,
          sourceStart: 0,
          name: 'Main video',
        },
      ],
      audioClips: [],
      canvasElements: [
        {
          type: 'text',
          text: 'HOW TO',
          templateId: 'film-title',
          verticalAlign: 'center',
          fontSize: 28,
          startTime: 0,
          endTime: 5,
          trackId: 'text',
          textStyle: {
            fill: '#ffffff',
            fontWeight: 'bold',
            letterSpacing: 4,
            textTransform: 'uppercase',
          },
        },
        {
          type: 'text',
          text: 'Subtitle goes here',
          templateId: 'minimal-label',
          verticalAlign: 'bottom',
          fontSize: 16,
          startTime: 0,
          endTime: 5,
          trackId: 'text',
          textStyle: {
            fill: '#ffffff',
            fontWeight: 'normal',
            align: 'center',
          },
        },
      ],
    },
  },
  {
    id: 'quote-card',
    name: 'Quote card',
    description: 'Text-first square layout — great for quotes, tips, or announcements.',
    aspectRatio: '1:1',
    durationSec: 10,
    categories: ['social'],
    slots: [],
    blueprint: {
      videoClips: [],
      audioClips: [],
      canvasElements: [
        {
          type: 'text',
          text: 'Your quote',
          templateId: 'minimal-center',
          verticalAlign: 'center',
          fontSize: 24,
          startTime: 0,
          endTime: 10,
          trackId: 'text',
          textStyle: {
            fill: '#ffffff',
            fontWeight: 'normal',
            align: 'center',
          },
        },
        {
          type: 'text',
          text: '@handle',
          templateId: 'minimal-tag',
          verticalAlign: 'bottom',
          fontSize: 14,
          startTime: 0,
          endTime: 10,
          trackId: 'text',
          textStyle: {
            fill: '#a8a29e',
            fontWeight: 'normal',
            textTransform: 'uppercase',
            letterSpacing: 2,
          },
        },
      ],
    },
  },
];

export function getStudioTemplate(id: string): StudioTemplate | undefined {
  return STUDIO_TEMPLATES.find((t) => t.id === id);
}

export function getStudioTemplatesByCategory(categoryId: string): StudioTemplate[] {
  return STUDIO_TEMPLATES.filter((t) => t.categories.includes(categoryId));
}
