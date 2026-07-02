import { useRef, useState, useEffect } from 'react';
import { useAppStore } from '@/features/project';
import { Label } from '@/components/ui/Label';
import { Slider } from '@/components/ui/Slider';
import { StudioPanel } from '@/features/studio/components/StudioPanel';
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
import { loadGoogleFont } from '@/features/studio/lib/googleFontLoader';
import { GOOGLE_FONTS, FONT_CATEGORIES, type FontCategoryId } from '@/features/studio/constants/googleFonts';
import { TEXT_EFFECTS, TEXT_EFFECT_IDS } from '@/features/studio/constants/textEffects';
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
  const cfg = TEXT_EFFECTS[effectId];
  return (
    <button
      type="button"
      onClick={onClick}
      title={cfg.label}
      className={cn('canvas-effect-thumb', selected && 'canvas-effect-thumb--selected')}
      style={{ background: cfg.previewBg }}
    >
      <span
        className="canvas-effect-thumb-text"
        style={{
          color: cfg.previewColor,
          textShadow: cfg.shadowEnabled
            ? `0 0 ${cfg.shadowBlur ?? 12}px ${cfg.shadowColor}`
            : undefined,
          WebkitTextStroke: cfg.stroke
            ? `${cfg.strokeWidth ?? 1}px ${cfg.stroke}`
            : undefined,
        }}
      >
        Aa
      </span>
      <span className="canvas-effect-thumb-label">{cfg.label}</span>
    </button>
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
      for (const f of GOOGLE_FONTS) {
        await loadGoogleFont(f.family);
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
    ? GOOGLE_FONTS
    : GOOGLE_FONTS.filter((f) => f.category === catFilter);

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
  const updateCanvasElement = useAppStore((s) => s.updateCanvasElement);
  const selectCanvasElement = useAppStore((s) => s.selectCanvasElement);
  const removeCanvasElement = useAppStore((s) => s.removeCanvasElement);
  const replaceCanvasElementImage = useAppStore((s) => s.replaceCanvasElementImage);
  const duplicateCanvasElement = useAppStore((s) => s.duplicateCanvasElement);
  const status = useAppStore((s) => s.status);
  const { retranslateActiveSegment } = useVideoProcessing();
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const element = canvasElements.find((el) => el.id === selectedId);

  if (!element) {
    return (
      <StudioPanel title="Canvas selection" icon={<Type size={12} className="text-accent" />}>
        <p className="text-xs text-muted leading-relaxed">
          Click any text, sticker, or image on the preview to select it. Drag to move, use handles to
          resize, or double-click text to edit inline.
        </p>
      </StudioPanel>
    );
  }

  const isImage = element.type === 'logo' || element.type === 'image';
  const canvasW = Math.max(720, Math.round(element.x + element.width + 80));
  const canvasH = Math.max(
    480,
    Math.round(element.y + (isImage ? element.height : element.fontSize * 1.6) + 80),
  );

  const style = element.textStyle ?? {};

  const updateStyle = (patch: Partial<NonNullable<typeof style>>) =>
    updateCanvasElement(element.id, { textStyle: { ...style, ...patch } });

  const resetLayout = () => {
    if (isImage) {
      updateCanvasElement(element.id, {
        rotation: 0,
        opacity: element.type === 'logo' ? 1 : 0.85,
        width: element.type === 'logo' ? 120 : 200,
        height: element.type === 'logo' ? 48 : 120,
      });
      return;
    }
    updateCanvasElement(element.id, {
      rotation: 0,
      fontSize: element.type === 'text' ? 22 : 18,
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

  return (
    <div className="space-y-3">
      <StudioPanel title={elementTitle(element)} icon={panelIcon}>
        <div className="space-y-3">
          {isImage && element.src && (
            <div className="studio-canvas-image-preview">
              <img src={element.src} alt={element.text} />
            </div>
          )}

          {isImage && (
            <>
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
            </>
          )}

          {!isImage && (
            <div className="space-y-1.5">
              <Label>Content</Label>
              <textarea
                value={element.text}
                onChange={(e) => updateCanvasElement(element.id, { text: e.target.value })}
                rows={3}
                className="studio-canvas-textarea"
              />
            </div>
          )}

          {!isImage && (
            <Slider
              label="Font size"
              valueLabel={`${element.fontSize}px`}
              min={12}
              max={96}
              step={1}
              value={element.fontSize}
              onChange={(e) =>
                updateCanvasElement(element.id, { fontSize: parseInt(e.target.value, 10) })
              }
            />
          )}

          {!isImage && (
            <>
              {/* Font picker */}
              <div className="space-y-1.5">
                <Label>Font</Label>
                <FontPicker
                  value={element.fontFamily}
                  onChange={(f) => updateCanvasElement(element.id, { fontFamily: f })}
                />
              </div>

              {/* Text formatting row */}
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
                {/* Color swatch */}
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

              {/* Text effects */}
              <div className="space-y-1.5">
                <Label>Text effect</Label>
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
              </div>
            </>
          )}

          {isImage && (
            <Slider
              label="Opacity"
              valueLabel={`${Math.round(element.opacity * 100)}%`}
              min={0.1}
              max={1}
              step={0.05}
              value={element.opacity}
              onChange={(e) =>
                updateCanvasElement(element.id, { opacity: parseFloat(e.target.value) })
              }
            />
          )}

          <Slider
            label="Position X"
            valueLabel={`${Math.round(element.x)}px`}
            min={0}
            max={Math.max(100, canvasW)}
            step={1}
            value={element.x}
            onChange={(e) =>
              updateCanvasElement(element.id, { x: parseInt(e.target.value, 10) })
            }
          />

          <Slider
            label="Position Y"
            valueLabel={`${Math.round(element.y)}px`}
            min={0}
            max={Math.max(100, canvasH)}
            step={1}
            value={element.y}
            onChange={(e) =>
              updateCanvasElement(element.id, { y: parseInt(e.target.value, 10) })
            }
          />

          {!isImage && (
            <Slider
              label="Rotation"
              valueLabel={`${Math.round(element.rotation)}°`}
              min={-180}
              max={180}
              step={1}
              value={element.rotation}
              onChange={(e) =>
                updateCanvasElement(element.id, { rotation: parseInt(e.target.value, 10) })
              }
            />
          )}

          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-muted">
            <div className="studio-canvas-meta-chip">
              <span className="text-faint">X</span> {Math.round(element.x)}
            </div>
            <div className="studio-canvas-meta-chip">
              <span className="text-faint">Y</span> {Math.round(element.y)}
            </div>
            <div className="studio-canvas-meta-chip">
              <span className="text-faint">W</span> {Math.round(element.width)}
            </div>
            <div className="studio-canvas-meta-chip">
              <span className="text-faint">{isImage ? 'H' : '°'}</span>{' '}
              {isImage ? Math.round(element.height) : Math.round(element.rotation)}
            </div>
          </div>

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

          <button type="button" onClick={resetLayout} className="studio-tools-action-btn">
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
          {element.templateId && (
            <button
              type="button"
              onClick={() => removeCanvasElement(element.id)}
              className="studio-tools-action-btn w-full text-[#e8746a]"
            >
              <Trash2 size={14} />
              Remove template
            </button>
          )}
          {isImage && (
            <button
              type="button"
              onClick={() => removeCanvasElement(element.id)}
              className="studio-tools-action-btn w-full text-[#e8746a]"
            >
              <Trash2 size={14} />
              Remove from frame
            </button>
          )}
          <button
            type="button"
            onClick={() => selectCanvasElement(null)}
            className="studio-tools-action-btn w-full"
          >
            Deselect
          </button>
        </div>
      </StudioPanel>
    </div>
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
