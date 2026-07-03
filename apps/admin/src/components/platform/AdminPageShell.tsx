import type { ReactNode } from 'react';

export function AdminPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-transparent">
      {children}
    </div>
  );
}
