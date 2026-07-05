import { useCallback, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';

const TICK_POSITIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function snapToStep(value: number, min: number, step: number): number {
  if (step <= 0) return value;
  const steps = Math.round((value - min) / step);
  return min + steps * step;
}

interface InspectorBarSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Value restored when the reset button is pressed. */
  defaultValue?: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
  onReset?: () => void;
  disabled?: boolean;
  resetTitle?: string;
}

/**
 * Flat drag-to-set bar slider with tick marks, an inline editable value
 * readout, and an optional reset button — visual language shared across the
 * clip inspector's Video/Audio/Equalizer rows.
 */
export function InspectorBarSlider({
  label,
  value,
  min,
  max,
  step = 0.01,
  defaultValue,
  format,
  onChange,
  onReset,
  disabled = false,
  resetTitle,
}: InspectorBarSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState('');

  const pct = clamp(((value - min) / (max - min || 1)) * 100, 0, 100);
  const displayValue = format ? format(value) : String(value);

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return value;
      const rect = track.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / (rect.width || 1), 0, 1);
      return clamp(snapToStep(min + ratio * (max - min), min, step), min, max);
    },
    [min, max, step, value],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(valueFromClientX(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || e.buttons !== 1) return;
    onChange(valueFromClientX(e.clientX));
  };

  const commitDraft = () => {
    const parsed = Number(draftText);
    if (Number.isFinite(parsed)) onChange(clamp(parsed, min, max));
    setEditing(false);
  };

  return (
    <div className="inspector-bar-slider-row">
      <span className="inspector-bar-slider-label">{label}</span>
      <div className="inspector-bar-slider-controls">
        <div
          ref={trackRef}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-disabled={disabled}
          className={cn('inspector-bar-slider-track', disabled && 'is-disabled')}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              onChange(clamp(value + step, min, max));
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              onChange(clamp(value - step, min, max));
            }
          }}
        >
          <div className="inspector-bar-slider-ticks" aria-hidden>
            {TICK_POSITIONS.map((p) => (
              <span key={p} className="inspector-bar-slider-tick" style={{ left: `${p}%` }} />
            ))}
          </div>
          <div className="inspector-bar-slider-fill" style={{ width: `${pct}%` }} />
          <div className="inspector-bar-slider-thumb" style={{ left: `max(4px, ${pct}% - 1.5px)` }} />
          {editing ? (
            <input
              autoFocus
              className="inspector-bar-slider-value-input"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitDraft();
                if (e.key === 'Escape') setEditing(false);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="inspector-bar-slider-value"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                if (disabled) return;
                setDraftText(String(Number(value.toFixed(4))));
                setEditing(true);
              }}
            >
              {displayValue}
            </span>
          )}
        </div>
        {(onReset || defaultValue != null) && (
          <button
            type="button"
            className="inspector-bar-slider-reset"
            title={resetTitle ?? 'Reset'}
            disabled={disabled}
            onClick={() => (onReset ? onReset() : onChange(defaultValue ?? min))}
          >
            <RotateCcw size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
