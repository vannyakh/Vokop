import React from 'react';
import { Sidebar } from '../organisms/Sidebar';
import { Topbar } from '../organisms/Topbar';
import { Tabbar } from '../organisms/Tabbar';
import { SettingsDrawer } from '../organisms/SettingsDrawer';
import { NotificationOverlay } from '../organisms/NotificationOverlay';
import { useTabs } from '../../context/TabContext';
import { Loader2 } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  id?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, id }) => {
  const { isMaximized, isReloading } = useTabs();

  return (
    <div id={id} className="flex w-full h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)] transition-colors duration-200 relative">
      {/* 1. Global Navigation Sidebar */}
      {!isMaximized && <Sidebar />}

      {/* 2. Main Content Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Global Action Header */}
        {!isMaximized && <Topbar />}

        {/* Dynamic Navigation History Tabbar - always keep this visible to switch tabs and restore size! */}
        <Tabbar />

        {/* Stage Viewport */}
        <main className="flex-1 flex flex-col min-h-0 min-w-0 p-5 overflow-auto relative">
          {children}

          {/* Interactive view hot-reload glass spinner simulation */}
          {isReloading && (
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[4px] z-[9999] flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200">
              <div className="p-5 rounded-2xl bg-neutral-950/85 border border-white/10 shadow-2xl flex flex-col items-center gap-2.5">
                <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
                <span className="text-xs font-bold text-white/90 tracking-wider">RELOADING STATE...</span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Global Modals / Drawers */}
      <SettingsDrawer />
      <NotificationOverlay />
    </div>
  );
};
