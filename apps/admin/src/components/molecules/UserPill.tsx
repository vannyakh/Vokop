import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Settings as SettingsIcon, ShieldCheck, HelpCircle, LogOut } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useTheme } from '../../context/ThemeContext';

interface UserPillProps {
  id?: string;
}

export const UserPill: React.FC<UserPillProps> = ({ id }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { setIsOpen: setSettingsOpen, setActivePanel } = useSettings();
  const { theme } = useTheme();

  const handleOpenSettings = (panel: string) => {
    setActivePanel(panel);
    setSettingsOpen(true);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const isLight = theme === 'light';

  const buttonClass = isLight
    ? `flex items-center gap-2 h-9 p-[3px] pr-3 rounded-full border transition-all duration-150 cursor-pointer shadow-[0_2px_6px_rgba(15,23,42,0.04),inset_0_1px_1px_rgba(255,255,255,1)] ${
        isOpen 
          ? 'bg-white/95 border-indigo-500/40 shadow-[0_2px_8px_rgba(99,102,241,0.08)]' 
          : 'border-slate-200/90 bg-white/60 hover:bg-white/95 hover:border-slate-300'
      }`
    : `flex items-center gap-2 h-9 p-[3px] pr-3 rounded-full border border-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_1.5px_1.5px_0_-1px_rgba(255,255,255,0.6)] bg-white/5 backdrop-blur-[8px] hover:bg-white/10 transition-all duration-150 cursor-pointer ${
        isOpen ? 'bg-white/12 border-[var(--indigo)] border-opacity-50' : ''
      }`;

  const menuClass = isLight
    ? "absolute right-0 mt-2 w-[230px] rounded-2xl p-2 bg-white/95 border border-slate-200/90 shadow-[0_20px_40px_rgba(15,23,42,0.12),0_4px_12px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-[24px] transition-all duration-150 transform origin-top-right z-[9999]"
    : "absolute right-0 mt-2 w-[230px] rounded-2xl p-2 bg-[#0f0f17]/95 border border-white/10 shadow-[0_24px_50px_rgba(0,0,0,0.65),0_4px_14px_rgba(0,0,0,0.4),inset_0_0_0_1px_rgba(255,255,255,0.1),inset_1.5px_2px_0_-1.5px_rgba(255,255,255,0.7)] backdrop-blur-[18px] transition-all duration-150 transform origin-top-right z-[9999]";

  const headerDividerClass = isLight
    ? "relative flex items-center gap-2.5 p-2 pb-3 mb-1 after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-slate-200/80 after:to-transparent"
    : "relative flex items-center gap-2.5 p-2 pb-3 mb-1 after:content-[''] after:absolute after:left-2 after:right-2 after:bottom-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-white/8 after:to-transparent";

  const itemClass = isLight
    ? "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[13px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-150 cursor-pointer"
    : "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[13px] text-[var(--text-mid)] hover:bg-white/6 hover:text-[var(--text)] transition-colors duration-150 cursor-pointer";

  const dividerClass = isLight
    ? "h-[1px] my-1 bg-gradient-to-r from-transparent via-slate-200/80 to-transparent"
    : "h-[1px] my-1 bg-gradient-to-r from-transparent via-white/7 to-transparent";

  const logoutItemClass = isLight
    ? "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[13px] font-medium text-rose-500 hover:bg-rose-500/8 transition-colors duration-150 cursor-pointer"
    : "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[13px] text-red-400 hover:bg-red-500/10 transition-colors duration-150 cursor-pointer";

  return (
    <div id={id} ref={dropdownRef} className="relative select-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClass}
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--indigo)] to-[#8b5cf6] flex items-center justify-center font-bold text-xs text-white">
          L
        </div>
        <span className="text-[13px] font-semibold text-[var(--text)]">Luki</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--text-dim)] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          strokeWidth={2.5}
        />
      </button>

      {/* Floating Dropdown Menu */}
      <div
        className={`${menuClass} ${
          isOpen ? 'opacity-100 visible translate-y-0 scale-100' : 'opacity-0 invisible -translate-y-2 scale-95 pointer-events-none'
        }`}
      >
        {/* Dropdown Header */}
        <div className={headerDividerClass}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--indigo)] to-[#8b5cf6] flex items-center justify-center font-bold text-sm text-white shadow-[0_0_0_2px_rgba(99,102,241,0.3)]">
            L
          </div>
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold text-[var(--text)] truncate">Luki</div>
            <div className="text-[11.5px] text-[var(--text-dim)] mt-0.5 truncate">luki@vok2z.com</div>
          </div>
        </div>

        {/* Dropdown Items */}
        <button
          onClick={() => setIsOpen(false)}
          className={itemClass}
        >
          <User className="w-3.75 h-3.75 text-[var(--text-dim)]" />
          My profile
        </button>

        <button
          onClick={() => handleOpenSettings('account')}
          className={itemClass}
        >
          <SettingsIcon className="w-3.75 h-3.75 text-[var(--text-dim)]" />
          Account settings
        </button>

        <button
          onClick={() => setIsOpen(false)}
          className={itemClass}
        >
          <ShieldCheck className="w-3.75 h-3.75 text-[var(--text-dim)]" />
          Verification status
        </button>

        <div className={dividerClass} />

        <button
          onClick={() => setIsOpen(false)}
          className={itemClass}
        >
          <HelpCircle className="w-3.75 h-3.75 text-[var(--text-dim)]" />
          Help center
        </button>

        <div className={dividerClass} />

        <button
          onClick={() => {
            setIsOpen(false);
            alert('Logging out of seller session...');
          }}
          className={logoutItemClass}
        >
          <LogOut className="w-3.75 h-3.75" />
          Log out
        </button>
      </div>
    </div>
  );
};
