import React from 'react';
import { Sun, Moon, Sparkles, Bell, Settings, Search } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { useSettings } from '../../context/SettingsContext';
import { useSearchModal } from '../../context/SearchModalContext';
import { Breadcrumbs } from '../molecules/Breadcrumbs';
import { UserPill } from '../molecules/UserPill';

interface TopbarProps {
  id?: string;
}

export const Topbar: React.FC<TopbarProps> = ({ id }) => {
  const { theme, toggleTheme } = useTheme();
  const { unreadCount, isOpen: isNotifOpen, setIsOpen: setNotifOpen } = useNotifications();
  const { setIsOpen: setSettingsOpen } = useSettings();
  const { toggleSearch } = useSearchModal();

  const defaultBreadcrumbs = [
    { label: 'Selling' },
    { label: 'Listings' },
    { label: 'Game keys', current: true },
  ];

  const renderThemeIcon = () => {
    const iconClass = 'w-[16px] h-[16px] transition-transform duration-300';
    switch (theme) {
      case 'light':
        return <Sun className={`${iconClass} text-amber-500 rotate-0`} />;
      case 'dim':
        return <Sparkles className={`${iconClass} text-indigo-400 rotate-0`} />;
      case 'dark':
      default:
        return <Moon className={`${iconClass} text-indigo-300 rotate-0`} />;
    }
  };

  const isLight = theme === 'light';

  // Liquid Glass style search box classes
  const searchButtonClass = isLight
    ? "hidden md:flex items-center gap-2.5 px-3.5 h-9 rounded-full border border-slate-200/90 bg-gradient-to-r from-slate-100/50 to-white/75 hover:from-slate-100/80 hover:to-white/95 hover:border-indigo-500/30 transition-all duration-300 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer shadow-[0_3px_10px_rgba(15,23,42,0.04),inset_0_1px_1px_rgba(255,255,255,1)] select-none mr-1 group"
    : "hidden md:flex items-center gap-2.5 px-3.5 h-9 rounded-full border border-white/12 bg-gradient-to-r from-white/4 to-white/8 hover:from-white/8 hover:to-white/12 hover:border-white/20 transition-all duration-300 text-[11.5px] font-semibold text-white/70 hover:text-white cursor-pointer shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_8px_16px_rgba(0,0,0,0.15)] select-none mr-1 group";

  const searchIconClass = isLight
    ? "w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors"
    : "w-3.5 h-3.5 text-white/50 group-hover:text-white transition-colors";

  const keyPillClass = isLight
    ? "flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-200/50 border border-slate-300/30 rounded-md text-[9px] font-bold tracking-wide text-slate-500 uppercase select-none shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.8)] ml-1"
    : "flex items-center gap-0.5 px-1.5 py-0.5 bg-white/10 border border-white/15 rounded-md text-[9px] font-bold tracking-wide text-white/85 uppercase select-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] ml-1";

  // Circular actions buttons classes (Theme toggle, notifications, settings)
  const actionButtonBase = "w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 backdrop-blur-[8px] select-none";

  const themeToggleClass = isLight
    ? `${actionButtonBase} border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-amber-500/30 bg-white/50 hover:bg-white/85 shadow-[0_3px_8px_rgba(15,23,42,0.04),inset_1px_1px_0_rgba(255,255,255,1)]`
    : `${actionButtonBase} border border-white/10 text-[var(--text-mid)] hover:text-[var(--text)] hover:border-amber-500/20 bg-white/5 hover:bg-white/10 shadow-[inset_1.5px_1.5px_0_-1px_rgba(255,255,255,0.4)]`;

  const notificationClass = isLight
    ? `${actionButtonBase} ${
        isNotifOpen 
          ? 'border-indigo-500/50 text-indigo-600 bg-white/95 shadow-[0_3px_10px_rgba(99,102,241,0.12)]' 
          : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:border-indigo-500/20 bg-white/50 hover:bg-white/85 shadow-[0_3px_8px_rgba(15,23,42,0.04),inset_1px_1px_0_rgba(255,255,255,1)]'
      }`
    : `${actionButtonBase} border border-white/10 text-[var(--text-mid)] hover:text-[var(--text)] bg-white/5 hover:bg-white/10 shadow-[inset_1.5px_1.5px_0_-1px_rgba(255,255,255,0.4)] ${
        isNotifOpen ? 'border-[var(--indigo)] border-opacity-50 text-[var(--text)] bg-white/8' : ''
      }`;

  const settingsClass = isLight
    ? `${actionButtonBase} border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-indigo-500/30 bg-white/50 hover:bg-white/85 shadow-[0_3px_8px_rgba(15,23,42,0.04),inset_1px_1px_0_rgba(255,255,255,1)]`
    : `${actionButtonBase} border border-white/10 text-[var(--text-mid)] hover:text-[var(--text)] hover:border-[var(--indigo)] hover:border-opacity-40 bg-white/5 hover:bg-white/10 shadow-[inset_1.5px_1.5px_0_-1px_rgba(255,255,255,0.4)]`;

  const dividerClass = isLight
    ? "h-9 w-[1px] bg-slate-200/80 mx-1"
    : "h-9 w-[1px] bg-white/8 mx-1";

  return (
    <div
      id={id}
      className="h-16 px-6 flex items-center justify-between gap-4 border-b border-[var(--border)] flex-shrink-0 relative z-40 transition-all duration-200"
      style={{
        background: 'color-mix(in srgb, var(--c-glass) calc(var(--glass-bg-alpha) * 0.7), transparent)',
        backdropFilter: 'blur(18px) saturate(160%)',
      }}
    >
      {/* Left side: Breadcrumbs & Global Search Indicator */}
      <div className="flex items-center gap-4">
        <Breadcrumbs items={defaultBreadcrumbs} />
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-2.5">
        {/* Liquid Glass Search trigger button */}
        <button
          onClick={toggleSearch}
          title="Search anything (⌘K)"
          className={searchButtonClass}
        >
          <Search className={searchIconClass} />
          <span className="tracking-wide">Search panel...</span>
          <div className={keyPillClass}>
            ⌘K
          </div>
        </button>

        {/* Dynamic Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch theme (current: ${theme})`}
          className={themeToggleClass}
        >
          {renderThemeIcon()}
        </button>

        {/* Stateful Notification Bell */}
        <button
          onClick={() => setNotifOpen(!isNotifOpen)}
          title="Notifications"
          className={notificationClass}
        >
          <Bell className="w-[16px] h-[16px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-[var(--bg)] flex items-center justify-center px-1 animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Global Settings Gear */}
        <button
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          className={settingsClass}
        >
          <Settings className="w-[16px] h-[16px]" />
        </button>

        {/* User Pill Dropdown */}
        <div className={dividerClass} />
        <UserPill />
      </div>
    </div>
  );
};
