import { useRef, useState, useEffect } from 'react';
import { useAppStore } from '@/features/project';
import { Label } from '@vokop/ui';
import { StudioPanel } from '@/features/studio/components/StudioPanel';
import { InspectorDock, InspectorSection } from '@/features/studio/components/InspectorSection';
import { InspectorBarSlider } from '@/features/studio/components/InspectorBarSlider';
import { useStudioEdit } from '@/features/studio/hooks/useStudioEdit';
import { frameReferenceSize } from '@/features/studio/lib/canvasCoords';
import { getTextEffectSeed } from '@vokop/shared';
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
  ChevronDown,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useVideoProcessing } from '@/features/translation';
import { loadStudioFont } from '@/features/studio/lib/fontLoader';
import { STUDIO_FONTS, FONT_CATEGORIES, type FontCategoryId } from '@/features/studio/constants/studioFonts';
import { TEXT_EFFECTS, TEXT_EFFECT_IDS } from '@/features/studio/constants/textEffects';
import { TextEffectPreviewCard } from '@/features/studio/components/TextEffectPreviewCard';
import type { CanvasElement, CanvasTextEffectId } from '@/types/canvas';

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

function FontPicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (family: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [catFilter, setCatFilter] = useState<FontCategoryId>('all');
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const newSet = new Set(loadedFonts);
      for (const f of STUDIO_FONTS) {
        await loadStudioFont(f.family);
        newSet.add(f.family);
      }
      setLoadedFonts(newSet);
    };
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const filtered = catFilter === 'all'
    ? STUDIO_FONTS
    : STUDIO_FONTS.filter((f) => f.category === catFilter);

  const display = value ?? 'Default';

  return (
    <div ref={containerRef} className="canvas-font-picker">
      <button
        type="button"
        className="canvas-font-picker-trigger"
        onClick={() => setOpen((p) => !p)}
        style={{ fontFamily: value ? `${value}, system-ui` : undefined }}
      >
        <span className="truncate flex-1 text-left">{display}</span>
        {value && (
          <button
            type="button"
            className="canvas-font-clear"
            onClick={(e) => { e.stopPropagation(); onChange(undefined); }}
            title="Clear font"
          >
            ×
          </button>
        )}
        <ChevronDown size={12} className="shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="canvas-font-dropdown">
          <div className="canvas-font-cats">
            {FONT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={cn('canvas-font-cat-btn', catFilter === cat.id && 'active')}
                onClick={() => setCatFilter(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="canvas-font-list">
            {filtered.map((font) => (
              <button
                key={font.family}
                type="button"
                className={cn('canvas-font-item', value === font.family && 'active')}
                style={{ fontFamily: `${font.family}, system-ui` }}
                onClick={() => { onChange(font.family); setOpen(false); }}
              >
                {font.family}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
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

  if (!element) {
    return (
      <InspectorDock title="Canvas selection" icon={<Type size={12} className="text-accent" />}>
        <p className="inspector-dock-empty">
          Click any text, sticker, or image on the preview to select it. Drag to move, use handles to
          resize, or double-click text to edit inline.
        </p>
      </InspectorDock>
    );
  }

  const isImage = element.type === 'logo' || element.type === 'image';
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

  return (
    <InspectorDock title={elementTitle(element)} icon={panelIcon}>
      {isImage && (
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
          <InspectorBarSlider
            label="Opacity"
            value={element.opacity}
            min={0.1}
            max={1}
            step={0.01}
            defaultValue={1}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => updateCanvasElement(element.id, { opacity: v })}
            resetTitle="Reset opacity"
          />
        </InspectorSection>
      )}

      {!isImage && (
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
      )}

      {!isImage && (
        <InspectorSection
          id="canvas-typography"
          title="Typography"
          icon={<Bold size={12} />}
          summary={`${Math.round(fontSizePx)}px · ${element.fontFamily ?? 'Default'}`}
          defaultOpen
        >
          <InspectorBarSlider
            label="Size"
            value={fontSizePx}
            min={8}
            max={200}
            step={1}
            defaultValue={22}
            format={(v) => `${Math.round(v)}px`}
            onChange={(v) => updateCanvasElement(element.id, { fontSize: v / refSize.height })}
            resetTitle="Reset font size"
          />
          <div className="space-y-1.5">
            <Label>Font</Label>
            <FontPicker
              value={element.fontFamily}
              onChange={(f) => updateCanvasElement(element.id, { fontFamily: f })}
            />
          </div>
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
              className={cn('canvas-fmt-btn', style.fontStyle === 'italic' && 'active')}
              onClick={() => updateStyle({ fontStyle: style.fontStyle === 'italic' ? 'normal' : 'italic' })}
              title="Italic"
            >
              <Italic size={13} />
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
            <div className="canvas-fmt-divider" />
            <div className="canvas-color-pick" title="Text color">
              <input
                type="color"
                value={style.fill ?? '#ffffff'}
                onChange={(e) => updateStyle({ fill: e.target.value })}
                className="canvas-color-input"
                title="Text color"
              />
              <span
                className="canvas-color-swatch"
                style={{ background: style.fill ?? '#ffffff' }}
              />
            </div>
          </div>
        </InspectorSection>
      )}

      {!isImage && (
        <InspectorSection
          id="canvas-effect"
          title="Text effect"
          icon={<Sparkles size={12} />}
          summary={effectLabel}
          defaultOpen
        >
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

      <InspectorSection
        id="canvas-transform"
        title="Transform"
        icon={<RotateCcw size={12} />}
        summary={`${Math.round(xPx)}, ${Math.round(yPx)}`}
        defaultOpen={false}
      >
        <InspectorBarSlider
          label="X"
          value={xPx}
          min={-refSize.width}
          max={Math.max(refSize.width, canvasW) * 1.5}
          step={1}
          defaultValue={0}
          format={(v) => `${Math.round(v)}px`}
          onChange={(v) => updateCanvasElement(element.id, { x: v / refSize.width })}
          resetTitle="Reset X"
        />
        <InspectorBarSlider
          label="Y"
          value={yPx}
          min={-refSize.height}
          max={Math.max(refSize.height, canvasH) * 1.5}
          step={1}
          defaultValue={0}
          format={(v) => `${Math.round(v)}px`}
          onChange={(v) => updateCanvasElement(element.id, { y: v / refSize.height })}
          resetTitle="Reset Y"
        />
        <InspectorBarSlider
          label="Width"
          value={widthPx}
          min={isImage ? 40 : 60}
          max={refSize.width * 2}
          step={1}
          defaultValue={isImage ? (element.type === 'logo' ? 120 : 200) : 280}
          format={(v) => `${Math.round(v)}px`}
          onChange={(v) => updateCanvasElement(element.id, { width: v / refSize.width })}
          resetTitle="Reset width"
        />
        {isImage && (
          <InspectorBarSlider
            label="Height"
            value={heightPx}
            min={24}
            max={refSize.height * 2}
            step={1}
            defaultValue={element.type === 'logo' ? 48 : 120}
            format={(v) => `${Math.round(v)}px`}
            onChange={(v) => updateCanvasElement(element.id, { height: v / refSize.height })}
            resetTitle="Reset height"
          />
        )}
        {!isImage && (
          <InspectorBarSlider
            label="Rotation"
            value={element.rotation}
            min={-180}
            max={180}
            step={1}
            defaultValue={0}
            format={(v) => `${Math.round(v)}\u00b0`}
            onChange={(v) => updateCanvasElement(element.id, { rotation: v })}
            resetTitle="Reset rotation"
          />
        )}
      </InspectorSection>

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
        <button
          type="button"
          onClick={() => clearFocus()}
          className="studio-tools-action-btn w-full"
        >
          Deselect
        </button>
      </InspectorSection>
    </InspectorDock>
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
