import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminConfig } from '../context/AdminConfigContext';
import { useTabs } from '../context/TabContext';

function findTabPath(
  tabId: string,
  nav: ReturnType<typeof useAdminConfig>['nav'],
): string | undefined {
  for (const section of nav) {
    for (const item of section.items) {
      if (item.id === tabId) return item.path;
      for (const sub of item.subItems ?? []) {
        if (sub.tabId === tabId) return sub.path;
      }
    }
  }
  return undefined;
}

function findTabByPath(
  pathname: string,
  nav: ReturnType<typeof useAdminConfig>['nav'],
): { id: string; label: string; type: string } | null {
  for (const section of nav) {
    for (const item of section.items) {
      if (item.path === pathname) {
        return { id: item.id, label: item.label, type: item.type };
      }
    }
  }
  return null;
}

export function activateRouterTab(
  tabId: string,
  nav: ReturnType<typeof useAdminConfig>['nav'],
): string {
  return findTabPath(tabId, nav) ?? '/';
}

/** Keeps tab bar selection and react-router paths in sync for router-mode shells. */
export function RouterNavBridge() {
  const { mode, nav } = useAdminConfig();
  const location = useLocation();
  const navigate = useNavigate();
  const { activeTabId, setActiveTabId, openTab } = useTabs();
  const skipTabToRouteSyncRef = useRef(false);

  // Route change → update tabs (sidebar, links, browser back/forward).
  useEffect(() => {
    if (mode !== 'router') return;

    skipTabToRouteSyncRef.current = true;

    const tab =
      findTabByPath(location.pathname, nav) ??
      (location.pathname === '/' ? { id: 'dashboard', label: 'Dashboard', type: 'dashboard' } : null);

    if (!tab) return;
    openTab(tab.id, tab.label, tab.type);
    setActiveTabId(tab.id);
  }, [location.pathname, mode, nav, openTab, setActiveTabId]);

  // Tab change → update route (tab bar click, close tab). Skip when route led the change.
  useEffect(() => {
    if (mode !== 'router' || !activeTabId) return;

    if (skipTabToRouteSyncRef.current) {
      skipTabToRouteSyncRef.current = false;
      return;
    }

    const path = findTabPath(activeTabId, nav);
    if (path && location.pathname !== path) {
      navigate(path);
    }
  }, [activeTabId, location.pathname, mode, nav, navigate]);

  return null;
}
