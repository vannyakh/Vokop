import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  valueLabel?: string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ className, label, valueLabel, ...props }, ref) => (
    <div className="space-y-2">
      {(label || valueLabel) && (
        <div className="flex justify-between items-center text-[9px] font-bold text-faint uppercase tracking-widest font-mono">
          {label && <span>{label}</span>}
          {valueLabel && <span className="text-accent">{valueLabel}</span>}
        </div>
      )}
      <input
        ref={ref}
        type="range"
        className={cn(
          'w-full h-1 rounded-lg appearance-none cursor-pointer',
          'bg-[var(--surface-hi)] accent-[var(--accent)]',
          className,
        )}
        {...props}
      />
    </div>
  ),
);

Slider.displayName = 'Slider';
