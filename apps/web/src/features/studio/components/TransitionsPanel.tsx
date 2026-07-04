import { useState } from 'react';
import { cn } from '@/lib/cn';
import type { EditorPreset } from '@vokop/shared';
import { getTransitionPreview } from '@/assets/support';

interface TransitionsPanelProps {
  presets: EditorPreset[];
  activeId?: string | null;
  disabled?: boolean;
  clipSelected: boolean;
  onSelect: (presetId: string) => void;
}

export function TransitionsPanel({
  presets,
  activeId,
  disabled,
  clipSelected,
  onSelect,
}: TransitionsPanelProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const focusId = hoveredId ?? activeId ?? presets[0]?.id ?? null;
  const focusPreset = presets.find((p) => p.id === focusId) ?? presets[0];
  const focusPreview = focusPreset ? getTransitionPreview(focusPreset.id) : undefined;

  if (!presets.length) {
    return <p className="tools-coming-soon-label">No transitions available</p>;
  }

  return (
    <div className="transitions-panel">
      <div className="transitions-hero">
        {focusPreview ? (
          <img
            src={focusPreview}
            alt=""
            className="transitions-hero-media"
            draggable={false}
          />
        ) : (
          <div className="transitions-hero-fallback" />
        )}
        <div className="transitions-hero-meta">
          <span className="transitions-hero-label">{focusPreset?.label ?? 'Transition'}</span>
          {focusPreset?.description && (
            <span className="transitions-hero-desc">{focusPreset.description}</span>
          )}
        </div>
      </div>

      {!clipSelected && (
        <p className="transitions-panel-hint">Select a timeline clip to apply a transition</p>
      )}

      <div className="transitions-grid" role="listbox" aria-label="Transition presets">
        {presets.map((preset) => {
          const preview = getTransitionPreview(preset.id);
          const active = activeId === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              role="option"
              aria-selected={active}
              className={cn(
                'transitions-card',
                active && 'is-active',
                !clipSelected && 'is-locked',
              )}
              disabled={disabled || !clipSelected}
              title={preset.description}
              onClick={() => onSelect(preset.id)}
              onMouseEnter={() => setHoveredId(preset.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(preset.id)}
              onBlur={() => setHoveredId(null)}
            >
              <span className="transitions-card-thumb">
                {preview ? (
                  <img
                    src={preview}
                    alt=""
                    className="transitions-card-media"
                    loading="lazy"
                    draggable={false}
                  />
                ) : (
                  <span className="transitions-card-fallback" />
                )}
                {active && <span className="transitions-card-check" aria-hidden>✓</span>}
              </span>
              <span className="transitions-card-label">{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
