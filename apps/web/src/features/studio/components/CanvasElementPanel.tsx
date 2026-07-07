import { useMemo, useRef } from 'react';
import { useAppStore } from '@/features/project';
import { Label } from '@vokop/ui';
import { ColorPickerContent, Popover, PopoverTrigger } from '@vokop/ui/shadcn';
import { StudioPanel } from '@/features/studio/components/StudioPanel';
import { InspectorSection } from '@/features/studio/components/InspectorSection';
import { InspectorField, InspectorFields } from '@/features/studio/components/InspectorField';
import { InspectorNumberField } from '@/features/studio/components/InspectorNumberField';
import {
  InspectorPropertiesShell,
  type InspectorTabDef,
} from '@/features/studio/components/InspectorPropertiesShell';
import { PropertyRow, PropertyRowPair } from '@/features/studio/components/PropertyRow';
import { NumberStepper } from '@/features/studio/components/NumberStepper';
import { CanvasFontPicker } from '@/features/studio/components/CanvasFontPicker';
import { RightPanelEmpty } from '@/features/studio/components/RightPanelEmpty';
import { useInspectorTabState } from '@/features/studio/hooks/useInspectorTabState';
import { useStudioEdit } from '@/features/studio/hooks/useStudioEdit';
import { frameReferenceSize } from '@/features/studio/lib/canvasCoords';
import { getTextEffectSeed } from '@vokop/shared';
import {
  CANVAS_ANIMATION_IN_PRESETS,
  CANVAS_ANIMATION_OUT_PRESETS,
  CANVAS_ANIMATION_LABELS,
  DEFAULT_ANIMATION_DURATION_SEC,
} from '@/features/studio/lib/canvasAnimations';
import type {
  CanvasAnimationInPresetId,
  CanvasAnimationOutPresetId,
} from '@/types/canvas';
import {
  Type,
  RotateCcw,
  Trash2,
  ImageIcon,
  Stamp,
  Sparkles,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Copy,
  Droplet,
  Square,
  Zap,
  CaseSensitive,
  Clapperboard,
  Droplets,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useVideoProcessing } from '@/features/translation';
import { TEXT_EFFECTS, TEXT_EFFECT_IDS } from '@/features/studio/constants/textEffects';
import { TextEffectPreviewCard } from '@/features/studio/components/TextEffectPreviewCard';
import type { CanvasElement, CanvasTextEffectId } from '@/types/canvas';

const TEXT_TAB_IDS = ['text', 'fill', 'border', 'effects', 'animation', 'transform'] as const;
const IMAGE_TAB_IDS = ['media', 'blending', 'transform'] as const;

type TextTabId = (typeof TEXT_TAB_IDS)[number];
type ImageTabId = (typeof IMAGE_TAB_IDS)[number];

function elementTitle(element: CanvasElement) {
  if (element.templateId) return 'Text template';
  if (element.type === 'text') return 'Text layer';
  if (element.type === 'overlay') return 'Overlay layer';
  if (element.type === 'logo') return 'Logo';
  return 'Image overlay';
}

function EffectThumbnail({
  effectId,
  selected,
  onClick,
}: {
  effectId: CanvasTextEffectId;
  selected: boolean;
  onClick: () => void;
}) {
  if (effectId === 'none') {
    const cfg = TEXT_EFFECTS.none;
    return (
      <button
        type="button"
        onClick={onClick}
        title={cfg.label}
        className={cn('canvas-effect-thumb', selected && 'canvas-effect-thumb--selected')}
        style={{ background: cfg.previewBg }}
      >
        <span className="canvas-effect-thumb-text" style={{ color: cfg.previewColor }}>
          Aa
        </span>
        <span className="canvas-effect-thumb-label">{cfg.label}</span>
      </button>
    );
  }

  return (
    <TextEffectPreviewCard
      effectId={effectId}
      compact
      selected={selected}
      onClick={onClick}
    />
  );
}

function AnimationPresetThumb({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn('canvas-effect-thumb', selected && 'canvas-effect-thumb--selected')}
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      <span className="canvas-effect-thumb-text" style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>
        ◆
      </span>
      <span className="canvas-effect-thumb-label">{label}</span>
    </button>
  );
}

function ColorSwatch({
  value,
  onChange,
  title,
}: {
  value: string;
  onChange: (value: string) => void;
  title?: string;
}) {
  const hexValue = value.startsWith('#') ? value.slice(1) : value;
  return (
    <div className="canvas-color-pick" title={title}>
      <Popover>
        <PopoverTrigger aria-label={title ?? 'Pick color'} className="canvas-color-input" />
        <span className="canvas-color-swatch" style={{ background: value }} />
        <ColorPickerContent
          value={hexValue}
          onChange={(hex) => onChange(`#${hex}`)}
          side="left"
        />
      </Popover>
    </div>
  );
}

function StyleSwitch({ on, onToggle, title }: { on: boolean; onToggle: () => void; title?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={title}
      className={cn('style-switch', on && 'is-on')}
      onClick={onToggle}
    >
      <span className="style-switch-knob" />
    </button>
  );
}

export function CanvasElementPanel() {
  const selectedId = useAppStore((s) => s.selectedCanvasElementId);
  const canvasElements = useAppStore((s) => s.canvasElements);
  const { updateCanvasElement, clearFocus } = useStudioEdit();
  const removeCanvasElement = useAppStore((s) => s.removeCanvasElement);
  const replaceCanvasElementImage = useAppStore((s) => s.replaceCanvasElementImage);
  const duplicateCanvasElement = useAppStore((s) => s.duplicateCanvasElement);
  const status = useAppStore((s) => s.status);
  const videoWidth = useAppStore((s) => s.videoWidth);
  const videoHeight = useAppStore((s) => s.videoHeight);
  const { retranslateActiveSegment } = useVideoProcessing();
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const element = canvasElements.find((el) => el.id === selectedId);
  const isImage = element?.type === 'logo' || element?.type === 'image';

  const textTabs = useMemo<InspectorTabDef[]>(
    () => [
      { id: 'text', label: 'Text', icon: <Type size={16} /> },
      { id: 'fill', label: 'Fill', icon: <Droplet size={16} /> },
      { id: 'border', label: 'Border', icon: <Square size={16} /> },
      { id: 'effects', label: 'Effects', icon: <Sparkles size={16} /> },
      { id: 'animation', label: 'Animation', icon: <Clapperboard size={16} /> },
      { id: 'transform', label: 'Transform', icon: <SlidersHorizontal size={16} /> },
    ],
    [],
  );

  const imageTabs = useMemo<InspectorTabDef[]>(
    () => [
      { id: 'media', label: 'Media', icon: <ImageIcon size={16} /> },
      { id: 'blending', label: 'Blending', icon: <Droplets size={16} /> },
      { id: 'transform', label: 'Transform', icon: <SlidersHorizontal size={16} /> },
    ],
    [],
  );

  const [textTab, setTextTab] = useInspectorTabState('canvas-text', 'text', TEXT_TAB_IDS);
  const [imageTab, setImageTab] = useInspectorTabState('canvas-image', 'media', IMAGE_TAB_IDS);

  if (!element) {
    return <RightPanelEmpty />;
  }
  // element.x/y/width/height/fontSize are fractions of the content rect; convert
  // to a stable "nominal px" number (relative to the project's video resolution)
  // for display/editing in this panel.
  const refSize = frameReferenceSize(videoWidth, videoHeight);
  const xPx = element.x * refSize.width;
  const yPx = element.y * refSize.height;
  const widthPx = element.width * refSize.width;
  const heightPx = element.height * refSize.height;
  const fontSizePx = element.fontSize * refSize.height;
  const canvasW = Math.max(720, Math.round(xPx + widthPx + 80));
  const canvasH = Math.max(
    480,
    Math.round(yPx + (isImage ? heightPx : fontSizePx * 1.6) + 80),
  );

  const style = element.textStyle ?? {};

  const updateStyle = (patch: Partial<NonNullable<typeof style>>) =>
    updateCanvasElement(element.id, { textStyle: { ...style, ...patch } });

  const toggleAnimationIn = (preset: CanvasAnimationInPresetId) => {
    const current = element.animationIn;
    if (current?.preset === preset) {
      updateCanvasElement(element.id, { animationIn: undefined });
      return;
    }
    updateCanvasElement(element.id, {
      animationIn: {
        preset,
        durationSec: current?.durationSec ?? DEFAULT_ANIMATION_DURATION_SEC,
      },
    });
  };

  const toggleAnimationOut = (preset: CanvasAnimationOutPresetId) => {
    const current = element.animationOut;
    if (current?.preset === preset) {
      updateCanvasElement(element.id, { animationOut: undefined });
      return;
    }
    updateCanvasElement(element.id, {
      animationOut: {
        preset,
        durationSec: current?.durationSec ?? DEFAULT_ANIMATION_DURATION_SEC,
      },
    });
  };

  const animationSummary = [
    element.animationIn ? CANVAS_ANIMATION_LABELS[element.animationIn.preset] : null,
    element.animationOut ? CANVAS_ANIMATION_LABELS[element.animationOut.preset] : null,
  ]
    .filter(Boolean)
    .join(' · ') || 'None';

  const resetLayout = () => {
    if (isImage) {
      updateCanvasElement(element.id, {
        rotation: 0,
        opacity: element.type === 'logo' ? 1 : 0.85,
        width: (element.type === 'logo' ? 120 : 200) / refSize.width,
        height: (element.type === 'logo' ? 48 : 120) / refSize.height,
      });
      return;
    }
    updateCanvasElement(element.id, {
      rotation: 0,
      fontSize: (element.type === 'text' ? 22 : 18) / refSize.height,
      fontFamily: undefined,
      textEffect: undefined,
      textStyle: {},
    });
  };

  const panelIcon =
    element.type === 'logo' ? (
      <Stamp size={12} className="text-accent" />
    ) : element.type === 'image' ? (
      <ImageIcon size={12} className="text-accent" />
    ) : (
      <Type size={12} className="text-accent" />
    );

  const effectLabel =
    element.textEffect && element.textEffect !== 'none'
      ? (getTextEffectSeed(element.textEffect)?.sampleText ??
        TEXT_EFFECTS[element.textEffect]?.label ??
        element.textEffect)
      : 'None';

  const transformSection = (
    <InspectorSection
      id="canvas-transform"
      title="Transform"
      summary={`${Math.round(xPx)}, ${Math.round(yPx)}`}
      defaultOpen
    >
      <InspectorFields>
        <InspectorField label="X">
          <InspectorNumberField
            icon="X"
            value={xPx}
            min={-refSize.width}
            max={Math.max(refSize.width, canvasW) * 1.5}
            step={1}
            scrubPixelsPerUnit={2}
            format={(v) => `${Math.round(v)}px`}
            isDefault={element.x === 0}
            onChange={(v) => updateCanvasElement(element.id, { x: v / refSize.width })}
            onReset={() => updateCanvasElement(element.id, { x: 0 })}
          />
        </InspectorField>
        <InspectorField label="Y">
          <InspectorNumberField
            icon="Y"
            value={yPx}
            min={-refSize.height}
            max={Math.max(refSize.height, canvasH) * 1.5}
            step={1}
            scrubPixelsPerUnit={2}
            format={(v) => `${Math.round(v)}px`}
            isDefault={element.y === 0}
            onChange={(v) => updateCanvasElement(element.id, { y: v / refSize.height })}
            onReset={() => updateCanvasElement(element.id, { y: 0 })}
          />
        </InspectorField>
        <InspectorField label="Width">
          <InspectorNumberField
            icon="W"
            value={widthPx}
            min={isImage ? 40 : 60}
            max={refSize.width * 2}
            step={1}
            scrubPixelsPerUnit={2}
            format={(v) => `${Math.round(v)}px`}
            isDefault={false}
            onChange={(v) => updateCanvasElement(element.id, { width: v / refSize.width })}
          />
        </InspectorField>
        {isImage && (
          <InspectorField label="Height">
            <InspectorNumberField
              icon="H"
              value={heightPx}
              min={24}
              max={refSize.height * 2}
              step={1}
              scrubPixelsPerUnit={2}
              format={(v) => `${Math.round(v)}px`}
              isDefault={false}
              onChange={(v) => updateCanvasElement(element.id, { height: v / refSize.height })}
            />
          </InspectorField>
        )}
        {!isImage && (
          <InspectorField label="Rotation">
            <InspectorNumberField
              icon="°"
              value={element.rotation}
              min={-180}
              max={180}
              step={1}
              format={(v) => `${Math.round(v)}°`}
              isDefault={element.rotation === 0}
              onChange={(v) => updateCanvasElement(element.id, { rotation: v })}
              onReset={() => updateCanvasElement(element.id, { rotation: 0 })}
            />
          </InspectorField>
        )}
      </InspectorFields>
    </InspectorSection>
  );

  const actionsFooter = (
    <InspectorSection id="canvas-actions" title="Actions" defaultOpen={false}>
      {!isImage && element.segmentType === 'translation' && element.segmentIndex != null && (
        <button
          type="button"
          disabled={status !== 'idle'}
          onClick={() => retranslateActiveSegment(element.segmentIndex!)}
          className="studio-tools-action-btn w-full"
        >
          {status === 'translating' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          AI retranslate line
        </button>
      )}
      <button type="button" onClick={resetLayout} className="studio-tools-action-btn w-full">
        <RotateCcw size={14} />
        Reset transform
      </button>
      <button
        type="button"
        onClick={() => duplicateCanvasElement(element.id)}
        className="studio-tools-action-btn w-full"
      >
        <Copy size={14} />
        Duplicate
      </button>
      {(element.templateId || isImage) && (
        <button
          type="button"
          onClick={() => removeCanvasElement(element.id)}
          className="studio-tools-action-btn w-full text-[#e8746a]"
        >
          <Trash2 size={14} />
          {isImage ? 'Remove from frame' : 'Remove template'}
        </button>
      )}
      <button type="button" onClick={() => clearFocus()} className="studio-tools-action-btn w-full">
        Deselect
      </button>
    </InspectorSection>
  );

  if (isImage) {
    const tab = imageTab as ImageTabId;
    return (
      <InspectorPropertiesShell
        title={elementTitle(element)}
        icon={panelIcon}
        tabs={imageTabs}
        activeTabId={tab}
        onTabChange={setImageTab}
        footer={actionsFooter}
      >
        {tab === 'media' && (
          <InspectorSection
            id="canvas-media"
            title="Media"
            icon={<ImageIcon size={12} />}
            summary={element.text}
            defaultOpen
          >
            {element.src && (
              <div className="studio-canvas-image-preview">
                <img src={element.src} alt={element.text} />
              </div>
            )}
            <input
              ref={replaceInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) replaceCanvasElementImage(element.id, file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => replaceInputRef.current?.click()}
              className="studio-tools-action-btn w-full"
            >
              <ImageIcon size={14} />
              Replace image
            </button>
          </InspectorSection>
        )}
        {tab === 'blending' && (
          <InspectorSection id="canvas-blending" title="Blending" defaultOpen>
            <InspectorFields>
              <InspectorField label="Opacity">
                <InspectorNumberField
                  icon={<Droplets size={12} />}
                  value={element.opacity}
                  min={0.1}
                  max={1}
                  step={0.01}
                  scrubPixelsPerUnit={120}
                  format={(v) => `${Math.round(v * 100)}%`}
                  isDefault={element.opacity === 1}
                  onChange={(v) => updateCanvasElement(element.id, { opacity: v })}
                  onReset={() => updateCanvasElement(element.id, { opacity: 1 })}
                />
              </InspectorField>
            </InspectorFields>
          </InspectorSection>
        )}
        {tab === 'transform' && transformSection}
      </InspectorPropertiesShell>
    );
  }

  const tab = textTab as TextTabId;
  return (
    <InspectorPropertiesShell
      title={elementTitle(element)}
      icon={panelIcon}
      tabs={textTabs}
      activeTabId={tab}
      onTabChange={setTextTab}
      footer={actionsFooter}
    >
      {tab === 'text' && (
        <>
          <InspectorSection
            id="canvas-content"
            title="Content"
            icon={<Type size={12} />}
            summary={element.text.slice(0, 24)}
            defaultOpen
          >
            <textarea
              value={element.text}
              onChange={(e) => updateCanvasElement(element.id, { text: e.target.value })}
              rows={3}
              className="studio-canvas-textarea"
            />
          </InspectorSection>
          <InspectorSection
            id="canvas-text-style"
            title="Text style"
            icon={<Bold size={12} />}
            summary={`${element.fontFamily ?? 'Default'} · ${Math.round(fontSizePx)}px`}
            defaultOpen
          >
          <div className="space-y-1.5">
            <Label>Font</Label>
            <CanvasFontPicker
              value={element.fontFamily}
              onChange={(f) => updateCanvasElement(element.id, { fontFamily: f })}
            />
          </div>
          <PropertyRowPair>
            <PropertyRow label="Weight">
              <select
                className="property-select"
                value={style.fontWeight ?? 'normal'}
                onChange={(e) => updateStyle({ fontWeight: e.target.value as 'normal' | 'bold' })}
              >
                <option value="normal">Regular</option>
                <option value="bold">Bold</option>
              </select>
            </PropertyRow>
            <PropertyRow label="Size">
              <NumberStepper
                value={fontSizePx}
                min={8}
                max={400}
                step={1}
                suffix="px"
                onChange={(v) => updateCanvasElement(element.id, { fontSize: v / refSize.height })}
              />
            </PropertyRow>
          </PropertyRowPair>
          <PropertyRowPair>
            <PropertyRow label="Line height">
              <NumberStepper
                value={Math.round((style.lineHeight ?? 1.35) * 100)}
                min={50}
                max={300}
                step={5}
                suffix="%"
                onChange={(v) => updateStyle({ lineHeight: v / 100 })}
              />
            </PropertyRow>
            <PropertyRow label="Spacing">
              <NumberStepper
                value={style.letterSpacing ?? 0}
                min={-20}
                max={100}
                step={1}
                suffix="px"
                onChange={(v) => updateStyle({ letterSpacing: v })}
              />
            </PropertyRow>
          </PropertyRowPair>
          <PropertyRow label="Wrap">
            <select
              className="property-select"
              value={style.wrap ?? 'word'}
              onChange={(e) => updateStyle({ wrap: e.target.value as 'word' | 'char' | 'none' })}
            >
              <option value="word">Word</option>
              <option value="char">Character</option>
              <option value="none">None</option>
            </select>
          </PropertyRow>
          <div className="canvas-text-format-row">
            <button
              type="button"
              className={cn('canvas-fmt-btn', style.fontWeight === 'bold' && 'active')}
              onClick={() => updateStyle({ fontWeight: style.fontWeight === 'bold' ? 'normal' : 'bold' })}
              title="Bold"
            >
              <Bold size={13} />
            </button>
            <button
              type="button"
              className={cn('canvas-fmt-btn', style.underline && 'active')}
              onClick={() => updateStyle({ underline: !style.underline })}
              title="Underline"
            >
              <Underline size={13} />
            </button>
            <button
              type="button"
              className={cn('canvas-fmt-btn', style.fontStyle === 'italic' && 'active')}
              onClick={() => updateStyle({ fontStyle: style.fontStyle === 'italic' ? 'normal' : 'italic' })}
              title="Italic"
            >
              <Italic size={13} />
            </button>
            <button
              type="button"
              className={cn('canvas-fmt-btn', style.textTransform === 'uppercase' && 'active')}
              onClick={() =>
                updateStyle({
                  textTransform: style.textTransform === 'uppercase' ? 'none' : 'uppercase',
                })
              }
              title="Uppercase"
            >
              <CaseSensitive size={13} />
            </button>
            <div className="canvas-fmt-divider" />
            <button
              type="button"
              className={cn('canvas-fmt-btn', style.align === 'left' && 'active')}
              onClick={() => updateStyle({ align: 'left' })}
              title="Align left"
            >
              <AlignLeft size={13} />
            </button>
            <button
              type="button"
              className={cn('canvas-fmt-btn', (!style.align || style.align === 'center') && 'active')}
              onClick={() => updateStyle({ align: 'center' })}
              title="Align center"
            >
              <AlignCenter size={13} />
            </button>
            <button
              type="button"
              className={cn('canvas-fmt-btn', style.align === 'right' && 'active')}
              onClick={() => updateStyle({ align: 'right' })}
              title="Align right"
            >
              <AlignRight size={13} />
            </button>
          </div>
        </InspectorSection>
        </>
      )}

      {tab === 'fill' && (
        <InspectorSection
          id="canvas-fill"
          title="Fill"
          icon={<Droplet size={12} />}
          summary={
            style.fillGradient
              ? 'Gradient'
              : style.background
                ? 'Text + BG'
                : 'Solid'
          }
          defaultOpen={false}
        >
          <div className="style-color-row">
            <ColorSwatch
              value={style.fill ?? '#ffffff'}
              onChange={(v) => updateStyle({ fill: v, fillGradient: undefined })}
              title="Text color"
            />
            <span className="property-row-label">Text color</span>
          </div>
          <div className="style-toggle-row">
            <span className="property-row-label">Gradient fill</span>
            <StyleSwitch
              on={!!style.fillGradient}
              title="Toggle gradient fill"
              onToggle={() =>
                updateStyle(
                  style.fillGradient
                    ? { fillGradient: undefined }
                    : {
                        fillGradient: {
                          colors: [style.fill ?? '#ffffff', '#54D6C9'],
                          direction: 'vertical',
                        },
                      },
                )
              }
            />
          </div>
          {style.fillGradient && (
            <>
              <div className="style-color-row">
                <ColorSwatch
                  value={style.fillGradient.colors[0]}
                  onChange={(v) =>
                    updateStyle({
                      fillGradient: {
                        ...style.fillGradient!,
                        colors: [v, style.fillGradient!.colors[1]],
                      },
                    })
                  }
                  title="Gradient start"
                />
                <span className="property-row-label">Start color</span>
              </div>
              <div className="style-color-row">
                <ColorSwatch
                  value={style.fillGradient.colors[1]}
                  onChange={(v) =>
                    updateStyle({
                      fillGradient: {
                        ...style.fillGradient!,
                        colors: [style.fillGradient!.colors[0], v],
                      },
                    })
                  }
                  title="Gradient end"
                />
                <span className="property-row-label">End color</span>
              </div>
              <PropertyRow label="Direction">
                <select
                  className="property-select"
                  value={style.fillGradient.direction}
                  onChange={(e) =>
                    updateStyle({
                      fillGradient: {
                        ...style.fillGradient!,
                        direction: e.target.value as 'vertical' | 'horizontal',
                      },
                    })
                  }
                >
                  <option value="vertical">Vertical</option>
                  <option value="horizontal">Horizontal</option>
                </select>
              </PropertyRow>
            </>
          )}
          <div className="style-toggle-row">
            <span className="property-row-label">Background box</span>
            <StyleSwitch
              on={!!style.background}
              title="Toggle background box"
              onToggle={() =>
                updateStyle({ background: style.background ? undefined : '#000000' })
              }
            />
          </div>
          {style.background && (
            <>
              <div className="style-color-row">
                <ColorSwatch
                  value={style.background}
                  onChange={(v) => updateStyle({ background: v })}
                  title="Background color"
                />
                <span className="property-row-label">Background color</span>
              </div>
              <PropertyRow label="Radius">
                <NumberStepper
                  value={style.backgroundRadius ?? 8}
                  min={0}
                  max={64}
                  step={1}
                  suffix="px"
                  onChange={(v) => updateStyle({ backgroundRadius: v })}
                />
              </PropertyRow>
            </>
          )}
        </InspectorSection>
      )}

      {tab === 'border' && (
        <InspectorSection
          id="canvas-border"
          title="Border"
          icon={<Square size={12} />}
          summary={style.strokeWidth ? `${style.strokeWidth}px` : 'None'}
          defaultOpen={false}
        >
          <div className="style-color-row">
            <ColorSwatch
              value={style.stroke ?? '#000000'}
              onChange={(v) => updateStyle({ stroke: v })}
              title="Border color"
            />
            <span className="property-row-label">Border color</span>
          </div>
          <PropertyRow label="Width">
            <NumberStepper
              value={style.strokeWidth ?? 0}
              min={0}
              max={20}
              step={0.5}
              precision={1}
              suffix="px"
              onChange={(v) => updateStyle({ strokeWidth: v })}
            />
          </PropertyRow>
          {(style.strokeWidth ?? 0) > 0 && (
            <PropertyRow label="Join">
              <select
                className="property-select"
                value={style.strokeLineJoin ?? 'miter'}
                onChange={(e) =>
                  updateStyle({
                    strokeLineJoin: e.target.value as 'miter' | 'round' | 'bevel',
                  })
                }
              >
                <option value="miter">Miter</option>
                <option value="round">Round</option>
                <option value="bevel">Bevel</option>
              </select>
            </PropertyRow>
          )}
        </InspectorSection>
      )}

      {tab === 'effects' && (
        <InspectorSection
          id="canvas-effect"
          title="Effects"
          icon={<Sparkles size={12} />}
          summary={effectLabel}
          defaultOpen={false}
        >
          <div className="style-toggle-row">
            <span className="property-row-label">Drop shadow</span>
            <StyleSwitch
              on={!!style.shadowColor}
              title="Toggle drop shadow"
              onToggle={() =>
                updateStyle(
                  style.shadowColor
                    ? {
                        shadowColor: undefined,
                        shadowBlur: undefined,
                        shadowOpacity: undefined,
                        shadowAngle: undefined,
                        shadowDistance: undefined,
                      }
                    : {
                        shadowColor: '#000000',
                        shadowBlur: 8,
                        shadowOpacity: 0.7,
                        shadowAngle: 45,
                        shadowDistance: 4,
                      },
                )
              }
            />
          </div>
          {style.shadowColor && (
            <>
              <div className="style-color-row">
                <ColorSwatch
                  value={style.shadowColor ?? '#000000'}
                  onChange={(v) => updateStyle({ shadowColor: v })}
                  title="Shadow color"
                />
                <span className="property-row-label">Shadow color</span>
              </div>
              <PropertyRowPair>
                <PropertyRow label="Blur">
                  <NumberStepper
                    value={style.shadowBlur ?? 0}
                    min={0}
                    max={40}
                    step={1}
                    suffix="px"
                    onChange={(v) => updateStyle({ shadowBlur: v })}
                  />
                </PropertyRow>
                <PropertyRow label="Opacity">
                  <NumberStepper
                    value={Math.round((style.shadowOpacity ?? 0.7) * 100)}
                    min={0}
                    max={100}
                    step={5}
                    suffix="%"
                    onChange={(v) => updateStyle({ shadowOpacity: v / 100 })}
                  />
                </PropertyRow>
              </PropertyRowPair>
              <PropertyRowPair>
                <PropertyRow label="Angle">
                  <NumberStepper
                    value={style.shadowAngle ?? 45}
                    min={0}
                    max={360}
                    step={5}
                    suffix="°"
                    onChange={(v) => updateStyle({ shadowAngle: v })}
                  />
                </PropertyRow>
                <PropertyRow label="Distance">
                  <NumberStepper
                    value={style.shadowDistance ?? 0}
                    min={0}
                    max={40}
                    step={1}
                    suffix="px"
                    onChange={(v) => updateStyle({ shadowDistance: v })}
                  />
                </PropertyRow>
              </PropertyRowPair>
            </>
          )}
          <div className="inspector-section-divider">
            <Zap size={11} />
            <span>Presets</span>
          </div>
          <div className="canvas-effects-grid">
            {TEXT_EFFECT_IDS.map((id) => (
              <EffectThumbnail
                key={id}
                effectId={id}
                selected={(element.textEffect ?? 'none') === id}
                onClick={() =>
                  updateCanvasElement(element.id, { textEffect: id === 'none' ? undefined : id })
                }
              />
            ))}
          </div>
        </InspectorSection>
      )}

      {tab === 'animation' && (
      <InspectorSection
        id="canvas-animation"
        title="Animation"
        icon={<Clapperboard size={12} />}
        summary={animationSummary}
        defaultOpen={false}
      >
        <div className="inspector-section-divider">
          <span>Animate in</span>
        </div>
        <PropertyRow label="Duration">
          <NumberStepper
            value={Math.round((element.animationIn?.durationSec ?? DEFAULT_ANIMATION_DURATION_SEC) * 10) / 10}
            min={0.1}
            max={3}
            step={0.1}
            precision={1}
            suffix="s"
            disabled={!element.animationIn}
            onChange={(v) => {
              if (!element.animationIn) return;
              updateCanvasElement(element.id, {
                animationIn: { ...element.animationIn, durationSec: v },
              });
            }}
          />
        </PropertyRow>
        <div className="canvas-effects-grid">
          {CANVAS_ANIMATION_IN_PRESETS.map((preset) => (
            <AnimationPresetThumb
              key={preset}
              label={CANVAS_ANIMATION_LABELS[preset]}
              selected={element.animationIn?.preset === preset}
              onClick={() => toggleAnimationIn(preset)}
            />
          ))}
        </div>

        <div className="inspector-section-divider">
          <span>Animate out</span>
        </div>
        <PropertyRow label="Duration">
          <NumberStepper
            value={Math.round((element.animationOut?.durationSec ?? DEFAULT_ANIMATION_DURATION_SEC) * 10) / 10}
            min={0.1}
            max={3}
            step={0.1}
            precision={1}
            suffix="s"
            disabled={!element.animationOut}
            onChange={(v) => {
              if (!element.animationOut) return;
              updateCanvasElement(element.id, {
                animationOut: { ...element.animationOut, durationSec: v },
              });
            }}
          />
        </PropertyRow>
        <div className="canvas-effects-grid">
          {CANVAS_ANIMATION_OUT_PRESETS.map((preset) => (
            <AnimationPresetThumb
              key={preset}
              label={CANVAS_ANIMATION_LABELS[preset]}
              selected={element.animationOut?.preset === preset}
              onClick={() => toggleAnimationOut(preset)}
            />
          ))}
        </div>
      </InspectorSection>
      )}

      {tab === 'transform' && transformSection}
    </InspectorPropertiesShell>
  );
}

export function CanvasFrameAssetsPanel() {
  const addCanvasLogo = useAppStore((s) => s.addCanvasLogo);
  const addCanvasImageOverlay = useAppStore((s) => s.addCanvasImageOverlay);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);

  const onLogoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addCanvasLogo(file);
    e.target.value = '';
  };

  const onOverlayPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addCanvasImageOverlay(file);
    e.target.value = '';
  };

  return (
    <StudioPanel title="Frame assets" icon={<ImageIcon size={12} className="text-accent" />}>
      <p className="text-xs text-muted leading-relaxed mb-3">
        Add a brand logo or image overlay on top of the video frame. Drag and resize on the canvas.
      </p>
      <div className="space-y-2">
        <input
          ref={logoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={onLogoPick}
        />
        <input
          ref={overlayInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={onOverlayPick}
        />
        <button
          type="button"
          onClick={() => logoInputRef.current?.click()}
          className="studio-tools-action-btn w-full"
        >
          <Stamp size={14} />
          Add logo
        </button>
        <button
          type="button"
          onClick={() => overlayInputRef.current?.click()}
          className="studio-tools-action-btn w-full"
        >
          <ImageIcon size={14} />
          Add image overlay
        </button>
      </div>
    </StudioPanel>
  );
}
