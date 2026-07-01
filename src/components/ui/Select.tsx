import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full bg-white/5 border-white/10 rounded-lg px-3 py-2 text-xs font-medium',
        'focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--text)] outline-none ring-1 ring-[color:var(--border)]',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);

Select.displayName = 'Select';
