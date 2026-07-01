import { cn } from '@/lib/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'info';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-mono',
        variant === 'info'
          ? 'bg-accent-soft border-[color:color-mix(in_srgb,var(--accent)_25%,transparent)] text-accent font-bold uppercase tracking-wider'
          : 'bg-[var(--surface-hi)] border-[color:var(--border)] text-muted',
        className,
      )}
    >
      {children}
    </div>
  );
}
