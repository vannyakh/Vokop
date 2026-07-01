import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Diamond, Info, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import {
  BASIC_TEXT_PRESETS,
  TEXT_TEMPLATE_CATEGORIES,
  TEXT_TEMPLATE_DRAG_MIME,
  getTemplatesByCategory,
  type TextTemplate,
  type TextTemplateFilter,
  type TextTemplateInput,
} from '@/features/studio/constants/textTemplates';
import { TEXT_EFFECTS, TEXT_EFFECT_IDS } from '@/features/studio/constants/textEffects';
import type { TextTemplateStyle } from '@/features/studio/constants/textTemplates';
import type { CanvasTextEffectId } from '@/types/canvas';

type TextPanelTab = 'templates' | 'effects';

function templateDragPayload(
  template: TextTemplateInput,
): string {
  return JSON.stringify(template);
}

function startTemplateDrag(e: React.DragEvent, template: TextTemplateInput) {
  e.dataTransfer.setData(TEXT_TEMPLATE_DRAG_MIME, templateDragPayload(template));
  e.dataTransfer.effectAllowed = 'copy';
}

function TemplatePreviewCard({
  template,
  onClick,
}: {
  template: Pick<TextTemplate, 'id' | 'previewText' | 'commercial' | 'style' | 'defaultText' | 'verticalAlign' | 'duration'>;
  onClick: () => void;
}) {
  const previewStyle = templateStyleToCss(template.style, 0.55);
  const dragTemplate: TextTemplateInput = {
    id: template.id,
    defaultText: template.defaultText,
    verticalAlign: template.verticalAlign,
    style: template.style,
    duration: template.duration,
  };

  return (
    <button
      type="button"
      className="text-template-card"
      draggable
      onDragStart={(e) => startTemplateDrag(e, dragTemplate)}
      onClick={onClick}
      title={`${template.previewText} — drag to canvas`}
    >
      {template.commercial && (
        <span className="text-template-card-badge" aria-label="Commercial">
          <Diamond size={10} />
        </span>
      )}
      <span className="text-template-card-preview" style={previewStyle}>
        {template.previewText}
      </span>
    </button>
  );
}

function templateStyleToCss(style: TextTemplateStyle, scale = 1): React.CSSProperties {
  return {
    color: style.fill,
    fontSize: `${Math.max(10, style.fontSize * scale)}px`,
    fontWeight: style.fontWeight === 'bold' ? 700 : 500,
    letterSpacing: style.letterSpacing ? `${style.letterSpacing * scale}px` : undefined,
    textTransform: style.textTransform,
    WebkitTextStroke: style.stroke ? `${Math.max(1, (style.strokeWidth ?? 1) * scale)}px ${style.stroke}` : undefined,
    textShadow: style.shadowBlur
      ? `0 2px ${style.shadowBlur * scale}px ${style.shadowColor ?? 'rgba(0,0,0,0.8)'}`
      : undefined,
    background: style.background,
    padding: style.background ? '4px 8px' : undefined,
    borderRadius: style.background ? 4 : undefined,
    textAlign: style.align ?? 'center',
  };
}

function TemplateCarousel({
  templates,
  onSelect,
}: {
  templates: TextTemplate[];
  onSelect: (template: TextTemplate) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({ left: dir * 120, behavior: 'smooth' });
  };

  if (templates.length === 0) return null;

  return (
    <div className="text-template-carousel">
      <button
        type="button"
        className="text-template-carousel-nav text-template-carousel-nav--prev"
        onClick={() => scroll(-1)}
        aria-label="Scroll left"
      >
        <ChevronLeft size={14} />
      </button>
      <div ref={scrollerRef} className="text-template-carousel-track">
        {templates.map((template) => (
          <TemplatePreviewCard
            key={template.id}
            template={template}
            onClick={() => onSelect(template)}
          />
        ))}
      </div>
      <button
        type="button"
        className="text-template-carousel-nav text-template-carousel-nav--next"
        onClick={() => scroll(1)}
        aria-label="Scroll right"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

export function TextTemplatesPanel() {
  const addTextTemplate = useAppStore((s) => s.addTextTemplate);
  const [tab, setTab] = useState<TextPanelTab>('templates');
  const [filter, setFilter] = useState<TextTemplateFilter>('all');

  const applyTemplate = (template: TextTemplate) => {
    addTextTemplate({
      id: template.id,
      defaultText: template.defaultText,
      verticalAlign: template.verticalAlign,
      style: template.style,
      duration: template.duration,
    });
  };

  const applyBasic = (preset: (typeof BASIC_TEXT_PRESETS)[keyof typeof BASIC_TEXT_PRESETS]) => {
    addTextTemplate({
      id: preset.id,
      defaultText: preset.defaultText,
      verticalAlign: preset.verticalAlign,
      style: preset.style,
    });
  };

  return (
    <div className="text-templates-panel">
      <div className="text-templates-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'templates'}
          className={cn('text-templates-tab', tab === 'templates' && 'active')}
          onClick={() => setTab('templates')}
        >
          Text templates
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'effects'}
          className={cn('text-templates-tab', tab === 'effects' && 'active')}
          onClick={() => setTab('effects')}
        >
          Text effects
        </button>
      </div>

      {tab === 'templates' && (
        <>
          <div className="text-templates-filters">
            <button
              type="button"
              className={cn('text-templates-filter', filter === 'all' && 'active')}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={cn('text-templates-filter', filter === 'commercial' && 'active')}
              onClick={() => setFilter('commercial')}
            >
              <Info size={12} />
              Commercial
            </button>
          </div>

          <section className="text-templates-section">
            <h3 className="text-templates-section-title">Basic</h3>
            <div className="text-templates-basic-grid">
              <button
                type="button"
                className="text-templates-basic-btn"
                draggable
                onDragStart={(e) =>
                  startTemplateDrag(e, {
                    id: BASIC_TEXT_PRESETS.heading.id,
                    defaultText: BASIC_TEXT_PRESETS.heading.defaultText,
                    verticalAlign: BASIC_TEXT_PRESETS.heading.verticalAlign,
                    style: BASIC_TEXT_PRESETS.heading.style,
                  })
                }
                onClick={() => applyBasic(BASIC_TEXT_PRESETS.heading)}
              >
                Add heading
              </button>
              <button
                type="button"
                className="text-templates-basic-btn"
                draggable
                onDragStart={(e) =>
                  startTemplateDrag(e, {
                    id: BASIC_TEXT_PRESETS.body.id,
                    defaultText: BASIC_TEXT_PRESETS.body.defaultText,
                    verticalAlign: BASIC_TEXT_PRESETS.body.verticalAlign,
                    style: BASIC_TEXT_PRESETS.body.style,
                  })
                }
                onClick={() => applyBasic(BASIC_TEXT_PRESETS.body)}
              >
                Add body text
              </button>
            </div>
          </section>

          {TEXT_TEMPLATE_CATEGORIES.map((category) => {
            const templates = getTemplatesByCategory(category.id, filter);
            if (templates.length === 0) return null;

            return (
              <section key={category.id} className="text-templates-section">
                <div className="text-templates-section-head">
                  <h3 className="text-templates-section-title">
                    {category.label}
                    {category.emoji && <span className="text-templates-emoji">{category.emoji}</span>}
                  </h3>
                  <span className="text-templates-view-all">{templates.length}</span>
                </div>
                <TemplateCarousel templates={templates} onSelect={applyTemplate} />
              </section>
            );
          })}
        </>
      )}

      {tab === 'effects' && (
        <div className="text-effects-panel">
          <p className="text-xs text-muted leading-relaxed mb-3">
            Click an effect to add a styled text element at the playhead.
          </p>
          <div className="text-effects-grid">
            {(TEXT_EFFECT_IDS.filter((id) => id !== 'none') as CanvasTextEffectId[]).map((effectId) => {
              const cfg = TEXT_EFFECTS[effectId];
              const isGlow =
                effectId === 'glow-teal' ||
                effectId === 'glow-orange' ||
                effectId === 'neon-pink' ||
                effectId === 'fire' ||
                effectId === 'ice';
              return (
                <button
                  key={effectId}
                  type="button"
                  className="text-effect-card"
                  style={{ background: cfg.previewBg }}
                  onClick={() => {
                    const styleOverrides: TextTemplateInput['style'] = {
                      fill: cfg.fill ?? cfg.previewColor,
                      fontSize: 28,
                      fontWeight: 'bold',
                      align: 'center',
                    };
                    if (cfg.stroke) {
                      styleOverrides.stroke = cfg.stroke;
                      styleOverrides.strokeWidth = cfg.strokeWidth ?? 2;
                    }
                    if (cfg.shadowEnabled) {
                      styleOverrides.shadowColor = cfg.shadowColor ?? 'rgba(0,0,0,0.7)';
                      styleOverrides.shadowBlur = cfg.shadowBlur ?? 10;
                    }
                    addTextTemplate({
                      id: `effect-${effectId}`,
                      defaultText: 'Effect text',
                      verticalAlign: 'center',
                      style: styleOverrides,
                      textEffect: effectId,
                    });
                  }}
                >
                  <span
                    className="text-effect-card-preview"
                    style={{
                      color: cfg.previewColor,
                      textShadow: isGlow
                        ? `0 0 ${cfg.shadowBlur ?? 14}px ${cfg.shadowColor}`
                        : cfg.shadowEnabled
                          ? `${cfg.shadowOffsetX ?? 0}px ${cfg.shadowOffsetY ?? 3}px ${cfg.shadowBlur ?? 6}px ${cfg.shadowColor}`
                          : undefined,
                      WebkitTextStroke: cfg.stroke
                        ? `${cfg.strokeWidth ?? 1}px ${cfg.stroke}`
                        : undefined,
                    }}
                  >
                    Aa
                  </span>
                  <span className="text-effect-card-label">{cfg.label}</span>
                  <Sparkles size={10} className="text-effect-card-icon" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
