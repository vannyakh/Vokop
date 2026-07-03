import React, { createContext, useContext, useState } from 'react';
import { Tab } from '../types';
import { initialTabs } from '../constants/mockData';
import { useAdminConfig } from './AdminConfigContext';

interface TabContextType {
  tabs: Tab[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  openTab: (id: string, label: string, type: string) => void;
  closeTab: (id: string) => void;
  addEmptyTab: () => void;
  isMaximized: boolean;
  setIsMaximized: (val: boolean) => void;
  isReloading: boolean;
  triggerReload: () => void;
  closeOtherTabs: () => void;
  closeAllTabs: () => void;
  closeLeftTabs: () => void;
  closeRightTabs: () => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export const TabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mode } = useAdminConfig();
  const [tabs, setTabs] = useState<Tab[]>(mode === 'router' ? [] : initialTabs);
  const [activeTabId, setActiveTabId] = useState<string>(mode === 'router' ? '' : 'dashboard');
  const [newTabCounter, setNewTabCounter] = useState<number>(1);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  const triggerReload = () => {
    if (isReloading) return;
    setIsReloading(true);
    setTimeout(() => {
      setIsReloading(false);
    }, 600);
  };

  const openTab = (id: string, label: string, type: string) => {
    setActiveTabId(id);
    setTabs((prev) => {
      if (prev.some((t) => t.id === id)) {
        return prev;
      }
      return [...prev, { id, label, type }];
    });
  };

  const closeTab = (id: string) => {
    setTabs((prev) => {
      const tabIndex = prev.findIndex((t) => t.id === id);
      if (tabIndex === -1) return prev;

      const newTabs = prev.filter((t) => t.id !== id);

      // If we closed the active tab, switch to another
      if (activeTabId === id) {
        if (newTabs.length > 0) {
          const nextActiveIndex = Math.min(tabIndex, newTabs.length - 1);
          setActiveTabId(newTabs[nextActiveIndex].id);
        } else {
          setActiveTabId('');
        }
      }

      return newTabs;
    });
  };

  const closeOtherTabs = () => {
    setTabs((prev) => prev.filter((t) => t.id === activeTabId));
  };

  const closeAllTabs = () => {
    setTabs([]);
    setActiveTabId('');
  };

  const closeLeftTabs = () => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === activeTabId);
      if (idx === -1) return prev;
      return prev.slice(idx);
    });
  };

  const closeRightTabs = () => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === activeTabId);
      if (idx === -1) return prev;
      return prev.slice(0, idx + 1);
    });
  };

  const addEmptyTab = () => {
    const count = newTabCounter + 1;
    setNewTabCounter(count);
    const newId = `new-tab-${count}`;
    const newTab: Tab = {
      id: newId,
      label: `New tab (${count})`,
      type: 'dashboard', // default to dashboard view
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  return (
    <TabContext.Provider
      value={{
        tabs,
        activeTabId,
        setActiveTabId,
        openTab,
        closeTab,
        addEmptyTab,
        isMaximized,
        setIsMaximized,
        isReloading,
        triggerReload,
        closeOtherTabs,
        closeAllTabs,
        closeLeftTabs,
        closeRightTabs,
      }}
    >
      {children}
    </TabContext.Provider>
  );
};

export const useTabs = () => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTabs must be used within a TabProvider');
  }
  return context;
};
