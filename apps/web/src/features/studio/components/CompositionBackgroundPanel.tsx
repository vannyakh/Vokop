import { Ban, Droplets, ImageIcon, Palette } from 'lucide-react';
import type { CompositionBackground, CompositionBackgroundMode } from '@vokop/shared';
import {
  BACKGROUND_BLUR_LEVELS,
  BACKGROUND_COLOR_PRESETS,
  BACKGROUND_IMAGE_PRESETS,
  blurLevelToPx,
} from '@vokop/shared';
import filterPreview from '@/assets/filter-preview.webp';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { InspectorSection } from '@/features/studio/components/InspectorSection';
import { backgroundSummary, mergeCompositionBackground } from '@/features/studio/lib/compositionBackground';

const MODE_TABS: {
  mode: CompositionBackgroundMode;
  label: string;
  icon: typeof Palette;
}[] = [
  { mode: 'color', label: 'Color', icon: Palette },
  { mode: 'blur', label: 'Blur', icon: Droplets },
  { mode: 'image', label: 'Image', icon: ImageIcon },
];

interface CompositionBackgroundPanelProps {
  background: CompositionBackground;
  onChange: (patch: Partial<CompositionBackground>) => void;
  showApplyToAll?: boolean;
  onApplyToAll?: () => void;
  compact?: boolean;
}

export function CompositionBackgroundPanel({
  background,
  onChange,
  showApplyToAll = false,
  onApplyToAll,
  compact = false,
}: CompositionBackgroundPanelProps) {
  const mediaAssets = useAppStore((s) => s.mediaAssets);
  const imageAssets = mediaAssets.filter((asset) => asset.kind === 'image' && asset.url);

  const setMode = (mode: CompositionBackgroundMode) => {
    if (mode === 'none') {
      onChange({ mode: 'none' });
      return;
    }
    onChange(
      mergeCompositionBackground(background, {
        mode,
        ...(mode === 'color'
          ? {
              color:
                background.mode === 'color' && background.color
                  ? background.color
                  : BACKGROUND_COLOR_PRESETS[4] ?? '#533483',
            }
          : {}),
        ...(mode === 'blur' ? { blurLevel: background.blurLevel ?? 2 } : {}),
        ...(mode === 'image'
          ? {
              imagePresetId:
                background.imagePresetId ?? BACKGROUND_IMAGE_PRESETS[0]?.id,
            }
          : {}),
      }),
    );
  };

  const activeMode =
    background.mode === 'none' || background.mode === 'color'
      ? 'color'
      : background.mode;

  return (
    <InspectorSection
      id="composition-background"
      title="Background"
      summary={backgroundSummary(background)}
      defaultOpen
      className={compact ? 'composition-panel-section' : undefined}
    >
      <div
        className={cn('composition-bg-mode-tabs', compact && 'composition-bg-mode-tabs--compact')}
        role="tablist"
        aria-label="Background mode"
      >
        {MODE_TABS.map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={activeMode === mode}
            aria-label={label}
            title={label}
            className={cn('composition-bg-mode-tab', activeMode === mode && 'is-active')}
            onClick={() => setMode(mode)}
          >
            <Icon size={compact ? 14 : 16} />
            {!compact ? <span>{label}</span> : null}
          </button>
        ))}
      </div>

      {activeMode === 'color' && (
        <div className={cn('composition-bg-section', compact && 'composition-bg-section--compact')}>
          <div className={cn('composition-bg-color-grid', compact && 'composition-bg-color-grid--compact')}>
            {BACKGROUND_COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  'composition-bg-color-swatch',
                  background.color === color && 'is-active',
                )}
                style={{ backgroundColor: color }}
                title={color}
                onClick={() => onChange({ mode: 'color', color })}
              />
            ))}
            <label className="composition-bg-color-swatch composition-bg-color-swatch--custom" title="Custom color">
              <input
                type="color"
                value={background.color ?? '#000000'}
                onChange={(e) => onChange({ mode: 'color', color: e.target.value })}
                className="composition-bg-color-input"
              />
            </label>
          </div>
        </div>
      )}

      {activeMode === 'blur' && (
        <div className={cn('composition-bg-section', compact && 'composition-bg-section--compact')}>
          <div className={cn('composition-bg-blur-grid', compact && 'composition-bg-blur-grid--compact')}>
            {BACKGROUND_BLUR_LEVELS.map((level) => {
              const blurPx = blurLevelToPx(level.level);
              const isActive = (background.blurLevel ?? 0) === level.level;
              return (
                <button
                  key={level.level}
                  type="button"
                  className={cn('composition-bg-blur-option', isActive && 'is-active')}
                  title={level.label}
                  onClick={() => onChange({ mode: 'blur', blurLevel: level.level })}
                >
                  <span className="composition-bg-blur-thumb-wrap">
                    {level.level === 0 ? (
                      <span className="composition-bg-blur-none">
                        <Ban size={compact ? 14 : 18} />
                      </span>
                    ) : (
                      <img
                        src={filterPreview}
                        alt=""
                        className="composition-bg-blur-thumb"
                        style={{ filter: `blur(${blurPx}px)` }}
                      />
                    )}
                  </span>
                  <span className="composition-bg-blur-label">{level.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeMode === 'image' && (
        <div className={cn('composition-bg-section', compact && 'composition-bg-section--compact')}>
          <div className={cn('composition-bg-image-grid', compact && 'composition-bg-image-grid--compact')}>
            {BACKGROUND_IMAGE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={cn(
                  'composition-bg-image-option',
                  background.imagePresetId === preset.id &&
                    !background.imageAssetId &&
                    'is-active',
                )}
                title={preset.label}
                onClick={() =>
                  onChange({
                    mode: 'image',
                    imagePresetId: preset.id,
                    imageAssetId: undefined,
                  })
                }
              >
                <span
                  className="composition-bg-image-thumb"
                  style={{ background: preset.gradient }}
                />
                <span className="composition-bg-image-label">{preset.label}</span>
              </button>
            ))}
            {imageAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                className={cn(
                  'composition-bg-image-option',
                  background.imageAssetId === asset.id && 'is-active',
                )}
                title={asset.name}
                onClick={() =>
                  onChange({
                    mode: 'image',
                    imageAssetId: asset.id,
                    imagePresetId: undefined,
                  })
                }
              >
                <img
                  src={asset.url}
                  alt=""
                  className="composition-bg-image-thumb composition-bg-image-thumb--photo"
                />
                <span className="composition-bg-image-label">{asset.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showApplyToAll && onApplyToAll && (
        <button type="button" className="composition-bg-apply-all" onClick={onApplyToAll}>
          Apply to all video clips
        </button>
      )}
    </InspectorSection>
  );
}
