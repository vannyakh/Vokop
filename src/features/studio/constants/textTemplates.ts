export type TextTemplateCategoryId = 'trending' | 'classic' | 'bold' | 'minimal';

export type TextTemplateFilter = 'all' | 'commercial';

export type TextVerticalAlign = 'top' | 'center' | 'bottom';

export interface TextTemplateStyle {
  fill: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase';
  stroke?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  background?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TextTemplate {
  id: string;
  name: string;
  previewText: string;
  defaultText: string;
  category: TextTemplateCategoryId;
  commercial?: boolean;
  duration?: number;
  verticalAlign: TextVerticalAlign;
  style: TextTemplateStyle;
}

export interface TextTemplateCategory {
  id: TextTemplateCategoryId;
  label: string;
  emoji?: string;
}

export const TEXT_TEMPLATE_CATEGORIES: TextTemplateCategory[] = [
  { id: 'trending', label: 'Trending', emoji: '🔥' },
  { id: 'classic', label: 'Classic' },
  { id: 'bold', label: 'Bold hits', emoji: '💥' },
  { id: 'minimal', label: 'Minimal' },
];

export const BASIC_TEXT_PRESETS = {
  heading: {
    id: 'basic-heading',
    name: 'Heading',
    previewText: 'Add heading',
    defaultText: 'Heading',
    verticalAlign: 'top' as const,
    style: {
      fill: '#ffffff',
      fontSize: 36,
      fontWeight: 'bold' as const,
      letterSpacing: 0.5,
      align: 'center' as const,
    },
  },
  body: {
    id: 'basic-body',
    name: 'Body',
    previewText: 'Add body text',
    defaultText: 'Body text',
    verticalAlign: 'center' as const,
    style: {
      fill: '#e8e4dc',
      fontSize: 20,
      fontWeight: 'normal' as const,
      align: 'center' as const,
    },
  },
};

export const TEXT_TEMPLATES: TextTemplate[] = [
  {
    id: 'neon-pop',
    name: 'Neon pop',
    previewText: 'PERFECTO',
    defaultText: 'PERFECTO',
    category: 'trending',
    commercial: true,
    verticalAlign: 'center',
    style: {
      fill: '#54D6C9',
      fontSize: 32,
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
    id: 'gold-crown',
    name: 'Gold crown',
    previewText: 'VIRAL',
    defaultText: 'VIRAL',
    category: 'trending',
    commercial: true,
    verticalAlign: 'top',
    style: {
      fill: '#F4B942',
      fontSize: 34,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      shadowColor: 'rgba(0,0,0,0.85)',
      shadowBlur: 12,
    },
  },
  {
    id: 'clean-caption',
    name: 'Clean caption',
    previewText: 'Caption',
    defaultText: 'Your caption here',
    category: 'trending',
    verticalAlign: 'bottom',
    style: {
      fill: '#ffffff',
      fontSize: 22,
      fontWeight: 'normal',
      background: 'rgba(0,0,0,0.55)',
      align: 'center',
    },
  },
  {
    id: 'retro-wave',
    name: 'Retro wave',
    previewText: 'WAVE',
    defaultText: 'WAVE',
    category: 'trending',
    verticalAlign: 'center',
    style: {
      fill: '#9C8CD8',
      fontSize: 30,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: 3,
    },
  },
  {
    id: 'film-title',
    name: 'Film title',
    previewText: 'TITLE',
    defaultText: 'TITLE',
    category: 'classic',
    verticalAlign: 'center',
    style: {
      fill: '#ffffff',
      fontSize: 28,
      fontWeight: 'bold',
      letterSpacing: 4,
      textTransform: 'uppercase',
    },
  },
  {
    id: 'subtitle-bar',
    name: 'Subtitle bar',
    previewText: 'Subtitle line',
    defaultText: 'Subtitle line',
    category: 'classic',
    verticalAlign: 'bottom',
    style: {
      fill: '#ffffff',
      fontSize: 18,
      fontWeight: 'normal',
      background: 'rgba(11,10,8,0.72)',
      align: 'center',
    },
  },
  {
    id: 'quote-serif',
    name: 'Quote',
    previewText: '"Quote"',
    defaultText: '"Your quote"',
    category: 'classic',
    verticalAlign: 'center',
    style: {
      fill: '#e8e4dc',
      fontSize: 24,
      fontWeight: 'normal',
      align: 'center',
    },
  },
  {
    id: 'impact-strike',
    name: 'Impact',
    previewText: 'BOOM',
    defaultText: 'BOOM',
    category: 'bold',
    commercial: true,
    verticalAlign: 'center',
    style: {
      fill: '#ffffff',
      fontSize: 40,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      stroke: '#e8746a',
      strokeWidth: 3,
    },
  },
  {
    id: 'sports-score',
    name: 'Sports',
    previewText: 'GOAL!',
    defaultText: 'GOAL!',
    category: 'bold',
    verticalAlign: 'top',
    style: {
      fill: '#54D6C9',
      fontSize: 36,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      shadowColor: 'rgba(0,0,0,0.9)',
      shadowBlur: 8,
    },
  },
  {
    id: 'minimal-tag',
    name: 'Tag',
    previewText: 'tag',
    defaultText: 'tag',
    category: 'minimal',
    verticalAlign: 'top',
    style: {
      fill: '#a8a29e',
      fontSize: 14,
      fontWeight: 'normal',
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
  },
  {
    id: 'minimal-label',
    name: 'Label',
    previewText: 'Label',
    defaultText: 'Label',
    category: 'minimal',
    verticalAlign: 'bottom',
    style: {
      fill: '#ffffff',
      fontSize: 16,
      fontWeight: 'normal',
      align: 'center',
    },
  },
  {
    id: 'minimal-center',
    name: 'Centered',
    previewText: 'Center',
    defaultText: 'Center',
    category: 'minimal',
    verticalAlign: 'center',
    style: {
      fill: '#ffffff',
      fontSize: 20,
      fontWeight: 'normal',
      align: 'center',
    },
  },
];

export function getTemplatesByCategory(
  categoryId: TextTemplateCategoryId,
  filter: TextTemplateFilter = 'all',
): TextTemplate[] {
  return TEXT_TEMPLATES.filter((t) => {
    if (t.category !== categoryId) return false;
    if (filter === 'commercial') return t.commercial === true;
    return true;
  });
}

export type TextTemplateInput = Pick<
  TextTemplate,
  'id' | 'defaultText' | 'verticalAlign' | 'style' | 'duration'
> & {
  previewText?: string;
  textEffect?: import('@/types/canvas').CanvasTextEffectId;
  fontFamily?: string;
};

export const TEXT_TEMPLATE_DRAG_MIME = 'application/x-vokop-text-template';

export interface AddTextTemplateOptions {
  x?: number;
  y?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}
