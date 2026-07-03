import { StatusDot } from '@/components/atoms/StatusDot';

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  disabled: 'bg-red-500/10 text-red-400 border-red-500/20',
  pending: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  admin: 'bg-[var(--indigo)]/10 text-[var(--indigo)] border-[var(--indigo)]/20',
  user: 'bg-white/5 text-[var(--text-mid)] border-white/10',
  guest: 'bg-white/5 text-[var(--text-dim)] border-white/10',
};

const statusDot: Record<string, 'green' | 'red' | 'indigo' | 'gray'> = {
  active: 'green',
  disabled: 'red',
  pending: 'indigo',
  admin: 'indigo',
  user: 'gray',
  guest: 'gray',
};

export function StatusPill({ value }: { value: string }) {
  const key = value.toLowerCase();
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase border ${
        statusStyles[key] ?? 'bg-white/5 text-[var(--text-mid)] border-white/10'
      }`}
    >
      <StatusDot color={statusDot[key] ?? 'gray'} />
      {value}
    </span>
  );
}

export function ModulePill({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10.5px] font-bold uppercase bg-white/5 border border-white/8 text-[var(--text-mid)]">
      {value}
    </span>
  );
}
