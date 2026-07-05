import { Minus, Plus } from 'lucide-react';

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  precision?: number;
  disabled?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Compact "- [value] +" numeric field — the Figma-style stepper used for
 * discrete properties (weight, size, line height, letter spacing, radius).
 */
export function NumberStepper({
  value,
  onChange,
  step = 1,
  min = -Infinity,
  max = Infinity,
  suffix,
  precision = 0,
  disabled = false,
}: NumberStepperProps) {
  const display = Number(value.toFixed(precision));

  return (
    <div className={`number-stepper${disabled ? ' is-disabled' : ''}`}>
      <button
        type="button"
        className="number-stepper-btn"
        disabled={disabled}
        onClick={() => onChange(clamp(display - step, min, max))}
        aria-label="Decrease"
      >
        <Minus size={11} />
      </button>
      <input
        type="number"
        className="number-stepper-input"
        value={display}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(clamp(Number(e.target.value) || 0, min, max))}
      />
      {suffix && <span className="number-stepper-suffix">{suffix}</span>}
      <button
        type="button"
        className="number-stepper-btn"
        disabled={disabled}
        onClick={() => onChange(clamp(display + step, min, max))}
        aria-label="Increase"
      >
        <Plus size={11} />
      </button>
    </div>
  );
}
