import { cn } from '@/lib/cn';
import type { EditorPreset } from '@vokop/shared';
import { getFilterPreviewImage, getTransitionPreview } from '@/assets/support';

interface EditorPresetGridProps {
  presets: EditorPreset[];
  activeId?: string | null;
  disabled?: boolean;
  onSelect: (presetId: string) => void;
  /** Use bundled asset previews for filters / transitions. */
  previewKind?: 'filters' | 'transitions' | 'none';
}

export function EditorPresetGrid({
  presets,
  activeId,
  disabled,
  onSelect,
  previewKind = 'none',
}: EditorPresetGridProps) {
  if (!presets.length) {
    return <p className="tools-coming-soon-label">No presets available</p>;
  }

  const filterPreview = previewKind === 'filters' ? getFilterPreviewImage() : undefined;

  return (
    <div className="tools-preset-grid">
      {presets.map((preset) => {
        const transitionSrc =
          previewKind === 'transitions' ? getTransitionPreview(preset.id) : undefined;
        const useCssFilter = Boolean(preset.cssFilter) && previewKind !== 'transitions';

        return (
          <button
            key={preset.id}
            type="button"
            className={cn('tools-preset-chip', activeId === preset.id && 'active')}
            disabled={disabled}
            title={preset.description}
            onClick={() => onSelect(preset.id)}
          >
            <span
              className={cn(
                'tools-preset-chip-preview',
                (transitionSrc || filterPreview) && 'tools-preset-chip-preview--media',
              )}
              style={
                useCssFilter
                  ? {
                      filter: preset.cssFilter === 'none' ? undefined : preset.cssFilter,
                      backgroundImage: filterPreview ? `url(${filterPreview})` : undefined,
                    }
                  : transitionSrc
                    ? { backgroundImage: `url(${transitionSrc})` }
                    : undefined
              }
            />
            <span className="tools-preset-chip-label">{preset.label}</span>
          </button>
        );
      })}
    </div>
  );
}
