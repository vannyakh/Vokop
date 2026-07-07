import type { ReactNode } from 'react';
import { StudioIcon } from '@vokop/ui';
import { useAppStore } from '@/features/project';
import { cn } from '@/lib/cn';

export interface InspectorTabDef {
  id: string;
  label: string;
  icon: ReactNode;
}

interface InspectorPropertiesShellProps {
  title: string;
  icon?: ReactNode;
  tabs: InspectorTabDef[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** OpenCut-style inspector: context header + vertical icon tab rail + scroll content. */
export function InspectorPropertiesShell({
  title,
  icon,
  tabs,
  activeTabId,
  onTabChange,
  children,
  footer,
  className,
}: InspectorPropertiesShellProps) {
  const setEditorOpen = useAppStore((s) => s.setEditorOpen);

  return (
    <div className={cn('inspector-properties-shell', className)}>
      <header className="inspector-properties-header">
        {icon}
        <h3 className="inspector-properties-title">{title}</h3>
        <button
          type="button"
          className="studio-right-panel-close inspector-properties-close"
          onClick={() => setEditorOpen(false)}
          title="Close panel"
          aria-label="Close panel"
        >
          <StudioIcon name="xMark" size={16} />
        </button>
      </header>

      <div className="inspector-properties-body">
        <nav className="inspector-properties-tabs" aria-label="Property tabs">
          {tabs.map((tab) => {
            const active = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                title={tab.label}
                aria-label={tab.label}
                aria-current={active ? 'true' : undefined}
                className={cn('inspector-properties-tab', active && 'is-active')}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.icon}
              </button>
            );
          })}
        </nav>

        <div className="inspector-properties-content studio-scrollbar">{children}</div>
      </div>

      {footer ? <footer className="inspector-properties-footer">{footer}</footer> : null}
    </div>
  );
}
