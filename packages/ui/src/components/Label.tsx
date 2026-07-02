import type { ReactNode } from 'react';
import { cn } from '../lib/cn.js';

export interface LabelProps {
  children: ReactNode;
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
