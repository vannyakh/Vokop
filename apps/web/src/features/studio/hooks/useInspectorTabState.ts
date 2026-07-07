import { useCallback, useState } from 'react';

const STORAGE_PREFIX = 'vokop-inspector-tab:';

function readTab(scope: string, fallback: string): string {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + scope);
    if (raw) return raw;
  } catch {
    /* ignore */
  }
  return fallback;
}

/** Persist active inspector sub-tab per panel scope (video clip, audio clip, …). */
export function useInspectorTabState(scope: string, defaultTab: string, validTabIds: readonly string[]) {
  const [activeTabId, setActiveTabId] = useState(() => {
    const stored = readTab(scope, defaultTab);
    return validTabIds.includes(stored) ? stored : defaultTab;
  });

  const setActiveTab = useCallback(
    (tabId: string) => {
      if (!validTabIds.includes(tabId)) return;
      setActiveTabId(tabId);
      try {
        localStorage.setItem(STORAGE_PREFIX + scope, tabId);
      } catch {
        /* ignore */
      }
    },
    [scope, validTabIds],
  );

  return [activeTabId, setActiveTab] as const;
}
