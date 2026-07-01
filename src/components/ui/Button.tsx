import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-[var(--accent-ink)] hover:opacity-90 shadow-lg shadow-[rgba(232,163,61,0.25)] disabled:hover:opacity-100',
  secondary:
    'bg-[var(--surface-hi)] text-muted hover:bg-[var(--surface)] hover:text-[var(--text)] border border-[color:var(--border)]',
  ghost: 'text-muted hover:text-[var(--text)] hover:bg-[var(--surface-hi)]',
  danger: 'bg-[#e8746a] text-white hover:opacity-90',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[10px] font-bold uppercase tracking-widest rounded-lg font-mono',
  md: 'px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded-full font-mono',
  lg: 'px-8 py-3 text-sm font-bold rounded-full',
  icon: 'p-2 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = 'Button';
