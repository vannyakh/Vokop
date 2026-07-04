import { cn } from '@/lib/cn';
import type { EditorPreset } from '@vokop/shared';
import { getFilterPreviewImage } from '@/assets/support';

interface FiltersPanelProps {
  presets: EditorPreset[];
  activeId?: string | null;
  disabled?: boolean;
  onSelect: (presetId: string) => void;
}

function cssFilterFor(preset: EditorPreset | undefined): string | undefined {
  if (!preset?.cssFilter || preset.cssFilter === 'none') return undefined;
  return preset.cssFilter;
}

export function FiltersPanel({
  presets,
  activeId,
  disabled,
  onSelect,
}: FiltersPanelProps) {
  const previewSrc = getFilterPreviewImage();

  if (!presets.length) {
    return <p className="tools-coming-soon-label">No filters available</p>;
  }

  return (
    <div className="filters-panel">
      <div className="filters-grid" role="listbox" aria-label="Color filters">
        {presets.map((preset) => {
          const active = activeId === preset.id;
          const filter = cssFilterFor(preset);

          return (
            <button
              key={preset.id}
              type="button"
              role="option"
              aria-selected={active}
              className={cn('filters-card', active && 'is-active')}
              disabled={disabled}
              title={preset.description ?? preset.label}
              onClick={() => onSelect(preset.id)}
            >
              <span className="filters-card-thumb">
                <img
                  src={previewSrc}
                  alt=""
                  className="filters-card-media"
                  style={{ filter }}
                  loading="lazy"
                  draggable={false}
                />
                {active && <span className="filters-card-check" aria-hidden>✓</span>}
              </span>
              <span className="filters-card-label">{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
