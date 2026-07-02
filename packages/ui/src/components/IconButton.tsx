import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, active, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'p-2 rounded-lg transition-all',
        active
          ? 'bg-accent text-[var(--accent-ink)]'
          : 'text-muted hover:text-[var(--text)] hover:bg-[var(--surface-hi)]',
        className,
      )}
      {...props}
    />
  ),
);

IconButton.displayName = 'IconButton';
