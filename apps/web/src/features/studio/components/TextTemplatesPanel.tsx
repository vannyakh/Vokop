import { useState } from 'react';
import { Diamond, Info, Loader2 } from 'lucide-react';
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
import { TEXT_EFFECT_CATEGORIES } from '@vokop/shared';
import { TextEffectPreviewCard } from '@/features/studio/components/TextEffectPreviewCard';
import { useTextEffectPreviews } from '@/features/studio/hooks/useTextEffectPreviews';
import { textEffectStyleOverrides } from '@/features/studio/lib/textEffectPreviewStyle';
import type { TextTemplateStyle } from '@/features/studio/constants/textTemplates';
import type { CanvasTextEffectId } from '@/types/canvas';
import type { TextEffectCategory } from '@vokop/shared';

type TextPanelTab = 'templates' | 'effects';
type EffectFilter = TextEffectCategory | 'all';

function templateDragPayload(template: TextTemplateInput): string {
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
  if (templates.length === 0) return null;

  return (
    <div className="text-template-carousel">
      <div className="text-template-carousel-track">
        {templates.map((template) => (
          <TemplatePreviewCard key={template.id} template={template} onClick={() => onSelect(template)} />
        ))}
      </div>
    </div>
  );
}

function applyTextEffect(
  addTextTemplate: ReturnType<typeof useAppStore.getState>['addTextTemplate'],
  effectId: CanvasTextEffectId,
  sampleText?: string,
) {
  const cfg = TEXT_EFFECTS[effectId];
  addTextTemplate({
    id: `effect-${effectId}`,
    defaultText: sampleText ?? 'Effect text',
    verticalAlign: 'center',
    style: textEffectStyleOverrides(cfg),
    textEffect: effectId,
  });
}

export function TextTemplatesPanel() {
  const addTextTemplate = useAppStore((s) => s.addTextTemplate);
  const [tab, setTab] = useState<TextPanelTab>('effects');
  const [filter, setFilter] = useState<TextTemplateFilter>('all');
  const [effectFilter, setEffectFilter] = useState<EffectFilter>('all');
  const { previewMap, loading: previewsLoading, pixabayEnabled } = useTextEffectPreviews();

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

  const effectIds = (TEXT_EFFECT_IDS.filter((id) => id !== 'none') as CanvasTextEffectId[]).filter(
    (id) => effectFilter === 'all' || previewMap.get(id)?.category === effectFilter,
  );

  return (
    <div className="text-templates-panel">
      <div className="text-templates-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'effects'}
          className={cn('text-templates-tab', tab === 'effects' && 'active')}
          onClick={() => setTab('effects')}
        >
          Text effects
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'templates'}
          className={cn('text-templates-tab', tab === 'templates' && 'active')}
          onClick={() => setTab('templates')}
        >
          Templates
        </button>
      </div>

      {tab === 'effects' && (
        <div className="text-effects-panel">
          <p className="text-effects-panel-lead">
            Preview effects on real stock photos. Click to add styled text at the playhead.
          </p>

          {!pixabayEnabled && !previewsLoading && (
            <p className="text-effects-api-hint">
              <Info size={12} aria-hidden />
              Set <code>PIXABAY_API_KEY</code> in server <code>.env</code> for photo previews.
            </p>
          )}

          <div className="text-effects-filters" role="tablist" aria-label="Effect categories">
            {TEXT_EFFECT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={effectFilter === cat.id}
                className={cn('text-effects-filter', effectFilter === cat.id && 'active')}
                onClick={() => setEffectFilter(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {previewsLoading ? (
            <div className="text-effects-loading">
              <Loader2 size={18} className="animate-spin text-muted" />
              <span>Loading previews…</span>
            </div>
          ) : (
            <div className="text-effects-grid">
              {effectIds.map((effectId) => (
                <TextEffectPreviewCard
                  key={effectId}
                  effectId={effectId}
                  preview={previewMap.get(effectId)}
                  onClick={() =>
                    applyTextEffect(addTextTemplate, effectId, previewMap.get(effectId)?.sampleText)
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

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
    </div>
  );
}
