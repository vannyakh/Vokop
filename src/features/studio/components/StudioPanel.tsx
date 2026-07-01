import { cn } from '@/lib/cn';

interface StudioPanelProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function StudioPanel({ title, icon, children, className }: StudioPanelProps) {
  return (
    <section className={cn('studio-panel p-4 space-y-3', className)}>
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted">{title}</h3>
      </div>
      {children}
    </section>
  );
}

interface StudioSectionLabelProps {
  children: React.ReactNode;
}

export function StudioSectionLabel({ children }: StudioSectionLabelProps) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-faint px-1">
      {children}
    </p>
  );
}
