import { useCallback, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface InspectorNumberFieldProps {
  value: number;
  onChange: (value: number) => void;
  icon?: React.ReactNode;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  /** Drag sensitivity: pixels of movement per unit. */
  scrubPixelsPerUnit?: number;
  disabled?: boolean;
  onReset?: () => void;
  isDefault?: boolean;
  resetTitle?: string;
  format?: (value: number) => string;
}

/**
 * OpenCut-style numeric field: bordered input, icon drag-to-scrub, optional reset.
 */
export function InspectorNumberField({
  value,
  onChange,
  icon,
  suffix,
  min = -Infinity,
  max = Infinity,
  step = 0.01,
  scrubPixelsPerUnit = 4,
  disabled = false,
  onReset,
  isDefault = false,
  resetTitle = 'Reset',
  format,
}: InspectorNumberFieldProps) {
  const iconRef = useRef<HTMLSpanElement | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const scrubStart = useRef({ value: 0, cumulative: 0 });

  const displayText =
    draft ?? (format ? format(value) : suffix ? `${value}${suffix}` : String(value));

  const commitDraft = () => {
    if (draft == null) return;
    const parsed = Number(draft.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(parsed)) onChange(clamp(parsed, min, max));
    setDraft(null);
  };

  const handleIconPointerDown = (e: React.PointerEvent) => {
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    scrubStart.current = { value, cumulative: 0 };
    iconRef.current?.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      scrubStart.current.cumulative += ev.movementX;
      const delta = scrubStart.current.cumulative / scrubPixelsPerUnit;
      const next = scrubStart.current.value + delta * step;
      onChange(clamp(next, min, max));
    };

    const onUp = () => {
      iconRef.current?.releasePointerCapture(e.pointerId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (disabled) return;
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      onChange(clamp(value + dir * step, min, max));
    },
    [disabled, min, max, onChange, step, value],
  );

  return (
    <div className={cn('inspector-number-field', disabled && 'is-disabled')}>
      {icon != null && (
        <span
          ref={iconRef}
          className="inspector-number-field-icon"
          onPointerDown={handleIconPointerDown}
          aria-hidden
        >
          {icon}
        </span>
      )}
      <input
        type="text"
        className="inspector-number-field-input"
        value={displayText}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setDraft(String(value))}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitDraft();
          if (e.key === 'Escape') setDraft(null);
        }}
        onWheel={handleWheel}
      />
      {onReset && !isDefault && (
        <button
          type="button"
          className="inspector-number-field-reset"
          title={resetTitle}
          disabled={disabled}
          onClick={onReset}
        >
          <RotateCcw size={12} />
        </button>
      )}
    </div>
  );
}
