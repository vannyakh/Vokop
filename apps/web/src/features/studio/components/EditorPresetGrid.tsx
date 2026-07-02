import { cn } from '@/lib/cn';
import type { EditorPreset } from '@vokop/shared';

interface EditorPresetGridProps {
  presets: EditorPreset[];
  activeId?: string | null;
  disabled?: boolean;
  onSelect: (presetId: string) => void;
}

export function EditorPresetGrid({
  presets,
  activeId,
  disabled,
  onSelect,
}: EditorPresetGridProps) {
  if (!presets.length) {
    return <p className="tools-coming-soon-label">No presets available</p>;
  }

  return (
    <div className="tools-preset-grid">
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className={cn('tools-preset-chip', activeId === preset.id && 'active')}
          disabled={disabled}
          title={preset.description}
          onClick={() => onSelect(preset.id)}
        >
          <span
            className="tools-preset-chip-preview"
            style={
              preset.cssFilter
                ? { filter: preset.cssFilter === 'none' ? undefined : preset.cssFilter }
                : undefined
            }
          />
          <span className="tools-preset-chip-label">{preset.label}</span>
        </button>
      ))}
    </div>
  );
}
