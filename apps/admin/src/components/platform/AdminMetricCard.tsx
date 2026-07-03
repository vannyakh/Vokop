import type { ReactNode } from 'react';

interface AdminMetricCardProps {
  title: string;
  value: string;
  hint: string;
  icon: ReactNode;
}

export function AdminMetricCard({ title, value, hint, icon }: AdminMetricCardProps) {
  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4.5 flex items-start justify-between shadow-sm">
      <div className="space-y-1.5">
        <div className="text-[11.5px] font-semibold text-[var(--text-dim)] uppercase tracking-wider">
          {title}
        </div>
        <div className="text-2xl font-bold text-[var(--text)]">{value}</div>
        <div className="text-xs text-[var(--text-dim)]">{hint}</div>
      </div>
      <div className="w-10 h-10 rounded-xl bg-white/4 border border-white/5 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
    </div>
  );
}
