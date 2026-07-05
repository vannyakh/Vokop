import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PropertyRowProps {
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * Flat "label-left, control-right" property row — the base unit of the
 * Premiere-style Effect Controls layout used across inspector panels.
 * No boxed background, just a hairline divider between rows.
 */
export function PropertyRow({ label, children, className }: PropertyRowProps) {
  return (
    <div className={cn('property-row', className)}>
      <span className="property-row-label">{label}</span>
      <div className="property-row-control">{children}</div>
    </div>
  );
}

/** Two property rows side by side, sharing one row's worth of vertical space. */
export function PropertyRowPair({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('property-row-pair', className)}>{children}</div>;
}
