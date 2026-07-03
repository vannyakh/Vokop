import type { ReactNode } from 'react';

interface AdminPageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4.5 shadow-sm">
      <div className="space-y-0.5">
        <h2 className="text-base font-bold text-[var(--text)] select-none">{title}</h2>
        <p className="text-xs text-[var(--text-dim)] select-none">{description}</p>
      </div>
      {actions ? <div className="flex-shrink-0">{actions}</div> : null}
    </div>
  );
}
