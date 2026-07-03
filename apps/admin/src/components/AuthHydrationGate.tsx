import { useEffect, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/features/auth';

export function AuthHydrationGate({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--text-mid)]">
        <Loader2 size={20} className="animate-spin" aria-hidden="true" />
      </div>
    );
  }

  return children;
}
