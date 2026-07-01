import { cn } from '@/lib/cn';

interface LabelProps {
  children: React.ReactNode;
  className?: string;
}

export function Label({ children, className }: LabelProps) {
  return (
    <label
      className={cn(
        'text-[9px] font-bold uppercase tracking-wider text-faint block font-mono',
        className,
      )}
    >
      {children}
    </label>
  );
}
