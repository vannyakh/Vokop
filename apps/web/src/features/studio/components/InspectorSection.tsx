import { useCallback, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

const STORAGE_PREFIX = 'vokop-inspector-section:';

function readOpen(id: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {
    /* ignore */
  }
  return fallback;
}

interface InspectorSectionProps {
  id: string;
  title: string;
  icon?: ReactNode;
  /** Shown in the header when collapsed (e.g. current value). */
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

/** Collapsible settings block for the right inspector dock. */
export function InspectorSection({
  id,
  title,
  icon,
  summary,
  defaultOpen = true,
  children,
  className,
}: InspectorSectionProps) {
  const [open, setOpen] = useState(() => readOpen(id, defaultOpen));

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_PREFIX + id, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [id]);

  return (
    <section className={cn('inspector-section', open && 'is-open', className)}>
      <button
        type="button"
        className="inspector-section-header"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`inspector-section-${id}`}
      >
        <span className="inspector-section-title">
          {icon}
          {title}
        </span>
        <span className="inspector-section-meta">
          {!open && summary != null && (
            <span className="inspector-section-summary">{summary}</span>
          )}
          <ChevronDown
            size={14}
            className={cn('inspector-section-chevron', open && 'is-open')}
            aria-hidden
          />
        </span>
      </button>
      {open && (
        <div id={`inspector-section-${id}`} className="inspector-section-body">
          {children}
        </div>
      )}
    </section>
  );
}

interface InspectorDockProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Flat inspector shell — no card-in-card. */
export function InspectorDock({ title, icon, children, className }: InspectorDockProps) {
  return (
    <div className={cn('inspector-dock', className)}>
      <header className="inspector-dock-header">
        {icon}
        <h3 className="inspector-dock-title">{title}</h3>
      </header>
      <div className="inspector-dock-sections">{children}</div>
    </div>
  );
}
