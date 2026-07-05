import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import type { EditorPreset, TimelineTransition } from '@vokop/shared';
import { getTransitionPreview } from '@/assets/support';
import { TransitionPreview } from '@/features/studio/components/TransitionPreview';
import { findAdjacentPairForClip, findTransitionForClip } from '@/features/studio/lib/timelineTransitions';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';

interface TransitionsPanelProps {
  presets: EditorPreset[];
  activeId?: string | null;
  disabled?: boolean;
  clipSelected: boolean;
  selectedClipId?: string | null;
  videoClips: MediaClip[];
  timelineTransitions: TimelineTransition[];
  onSelect: (presetId: string) => void;
  onDurationChange: (transitionId: string, durationSec: number) => void;
}

export function TransitionsPanel({
  presets,
  activeId,
  disabled,
  clipSelected,
  selectedClipId,
  videoClips,
  timelineTransitions,
  onSelect,
  onDurationChange,
}: TransitionsPanelProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);

  const adjacentPair = useMemo(
    () => (selectedClipId ? findAdjacentPairForClip(videoClips, selectedClipId) : null),
    [selectedClipId, videoClips],
  );

  const activeTransition = useMemo(
    () =>
      selectedClipId
        ? findTransitionForClip(timelineTransitions, selectedClipId, videoClips)
        : null,
    [selectedClipId, timelineTransitions, videoClips],
  );

  const previewPresetId = previewId ?? activeId ?? presets[1]?.id ?? 'dissolve';

  if (!presets.length) {
    return <p className="tools-coming-soon-label">No transitions available</p>;
  }

  return (
    <div className="transitions-panel">
      <div className="transitions-panel-preview">
        <TransitionPreview presetId={previewPresetId} label="Live preview" />
      </div>

      {!clipSelected && (
        <p className="transitions-panel-hint">
          Select a video clip that follows another clip to apply a transition.
        </p>
      )}

      {clipSelected && !adjacentPair && (
        <p className="transitions-panel-hint transitions-panel-hint--warn">
          Move this clip so it touches the previous clip — transitions apply between adjacent
          clips.
        </p>
      )}

      {adjacentPair && (
        <p className="transitions-panel-pair">
          Between <strong>{adjacentPair.outgoing.name}</strong> →{' '}
          <strong>{adjacentPair.incoming.name}</strong>
        </p>
      )}

      {activeTransition && (
        <label className="transitions-duration-control">
          <span>Overlap duration (sec)</span>
          <input
            type="number"
            min={0.05}
            max={5}
            step={0.05}
            value={Number(activeTransition.durationSec.toFixed(2))}
            onChange={(e) => onDurationChange(activeTransition.id, Number(e.target.value))}
          />
        </label>
      )}

      <div className="transitions-grid" role="listbox" aria-label="Transition presets">
        {presets.map((preset) => {
          const preview = getTransitionPreview(preset.id);
          const active = activeId === preset.id;
          const canApply = clipSelected && Boolean(adjacentPair);

          return (
            <button
              key={preset.id}
              type="button"
              role="option"
              aria-selected={active}
              className={cn(
                'transitions-card',
                active && 'is-active',
                !canApply && 'is-locked',
              )}
              disabled={disabled || !canApply}
              title={preset.description}
              onMouseEnter={() => setPreviewId(preset.id)}
              onMouseLeave={() => setPreviewId(null)}
              onFocus={() => setPreviewId(preset.id)}
              onBlur={() => setPreviewId(null)}
              onClick={() => onSelect(preset.id)}
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
