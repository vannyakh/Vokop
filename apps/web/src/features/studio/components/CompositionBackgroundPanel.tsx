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
}

export function CompositionBackgroundPanel({
  background,
  onChange,
  showApplyToAll = false,
  onApplyToAll,
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
        ...(mode === 'color' ? { color: background.color ?? '#000000' } : {}),
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

  const activeMode = background.mode === 'none' ? 'color' : background.mode;

  return (
    <InspectorSection
      id="composition-background"
      title="Background"
      summary={backgroundSummary(background)}
      defaultOpen
    >
      <div className="composition-bg-mode-tabs" role="tablist" aria-label="Background mode">
        {MODE_TABS.map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={activeMode === mode}
            title={label}
            className={cn('composition-bg-mode-tab', activeMode === mode && 'is-active')}
            onClick={() => setMode(mode)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {activeMode === 'color' && (
        <div className="composition-bg-section">
          <div className="composition-bg-color-grid">
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
          </div>
          <label className="composition-bg-color-picker">
            <span className="composition-bg-color-picker-label">Custom</span>
            <input
              type="color"
              value={background.color ?? '#000000'}
              onChange={(e) => onChange({ mode: 'color', color: e.target.value })}
              className="composition-bg-color-input"
            />
          </label>
        </div>
      )}

      {activeMode === 'blur' && (
        <div className="composition-bg-section">
          <div className="composition-bg-blur-grid">
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
                        <Ban size={18} />
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
        <div className="composition-bg-section">
          <div className="composition-bg-image-grid">
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
