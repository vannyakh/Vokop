import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface InspectorFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

/** OpenCut-style property row: label above control. */
export function InspectorField({ label, children, className }: InspectorFieldProps) {
  return (
    <div className={cn('inspector-field', className)}>
      <span className="inspector-field-label">{label}</span>
      {children}
    </div>
  );
}

export function InspectorFields({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('inspector-fields', className)}>{children}</div>;
}
