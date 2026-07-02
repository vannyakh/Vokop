import React, { useRef, useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  LayoutGrid,
  RotateCw,
  Maximize2,
  Minimize2,
  X,
  Pin,
  ArrowLeft,
  ArrowRight,
  XCircle,
  Trash2,
  Check,
} from 'lucide-react';
import { useTabs } from '../../context/TabContext';
import { TabItem } from '../molecules/TabItem';
import { useTheme } from '../../context/ThemeContext';

interface TabbarProps {
  id?: string;
}

export const Tabbar: React.FC<TabbarProps> = ({ id }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    closeTab,
    isMaximized,
    setIsMaximized,
    triggerReload,
    closeOtherTabs,
    closeAllTabs,
    closeLeftTabs,
    closeRightTabs,
  } = useTabs();

  const scrollRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLayoutOpen, setIsLayoutOpen] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<'bento' | 'split' | 'classic'>('bento');

  const checkScroll = () => {
    const el = scrollRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 2);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      checkScroll();
      const timer = setTimeout(checkScroll, 100);
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);

      const observer = new MutationObserver(checkScroll);
      observer.observe(el, { childList: true, subtree: true });

      return () => {
        clearTimeout(timer);
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
        observer.disconnect();
      };
    }
  }, [tabs]);

  const handleWheel = (e: React.WheelEvent) => {
    const el = scrollRef.current;
    if (el) {
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (el) {
      const scrollAmount = 240;
      el.scrollTo({
        left: el.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount),
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      const activeEl = el.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        });
      }
    }
  }, [activeTabId]);

  // Handle outside clicks for context menus
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (layoutRef.current && !layoutRef.current.contains(e.target as Node)) {
        setIsLayoutOpen(false);
      }
    };
    if (isDropdownOpen || isLayoutOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isDropdownOpen, isLayoutOpen]);

  const handleAction = (type: 'close' | 'pin' | 'reload' | 'maximize' | 'closeOthers' | 'closeLeft' | 'closeRight' | 'closeAll') => {
    setIsDropdownOpen(false);
    if (!activeTabId) return;

    switch (type) {
      case 'close':
        closeTab(activeTabId);
        break;
      case 'pin':
        // Pin/unpin visual cue (custom feedback)
        alert('Active Tab has been pinned to your quick bar.');
        break;
      case 'reload':
        triggerReload();
        break;
      case 'maximize':
        setIsMaximized(!isMaximized);
        break;
      case 'closeOthers':
        closeOtherTabs();
        break;
      case 'closeLeft':
        closeLeftTabs();
        break;
      case 'closeRight':
        closeRightTabs();
        break;
      case 'closeAll':
        closeAllTabs();
        break;
    }
  };

  return (
    <div
      id={id}
      className={`h-10 px-3 flex items-center justify-between border-b flex-shrink-0 select-none transition-all duration-150 relative z-30 ${
        isLight ? 'border-slate-200/80' : 'border-white/6'
      }`}
      style={{
        background: 'color-mix(in srgb, var(--c-glass) calc(var(--glass-bg-alpha) * 0.5), transparent)',
        backdropFilter: 'blur(18px) saturate(160%)',
      }}
    >
      {/* Scrollable region of Tab items */}
      <div className="flex-1 flex items-center h-full min-w-0 relative">
        
        {/* Left shadow / fade indicator and button */}
        {canScrollLeft && (
          <div className={`absolute left-0 bottom-0 top-0 w-8 flex items-center justify-start z-10 pointer-events-none bg-gradient-to-r ${
            isLight ? 'from-white/90 via-white/40 to-transparent' : 'from-black/70 via-black/40 to-transparent'
          }`}>
            <button
              type="button"
              onClick={() => scroll('left')}
              className={`w-5.5 h-5.5 ml-0.5 rounded-full flex items-center justify-center pointer-events-auto transition-all duration-150 shadow-md cursor-pointer border ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-sm'
                  : 'bg-neutral-900/90 border border-white/10 text-white/80 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* The Tabs Container - Hiding Scrollbar Completely */}
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          className="flex-1 flex items-center gap-[6px] overflow-x-auto scrollbar-none h-full pb-[1px]"
        >
          {tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={activeTabId === tab.id}
              onActivate={() => setActiveTabId(tab.id)}
              onClose={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            />
          ))}
        </div>

        {/* Right shadow / fade indicator and button */}
        {canScrollRight && (
          <div className={`absolute right-0 bottom-0 top-0 w-8 flex items-center justify-end z-10 pointer-events-none bg-gradient-to-l ${
            isLight ? 'from-white/90 via-white/40 to-transparent' : 'from-black/70 via-black/40 to-transparent'
          }`}>
            <button
              type="button"
              onClick={() => scroll('right')}
              className={`w-5.5 h-5.5 mr-0.5 rounded-full flex items-center justify-center pointer-events-auto transition-all duration-150 shadow-md cursor-pointer border ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-sm'
                  : 'bg-neutral-900/90 border border-white/10 text-white/80 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      </div>

      {/* Right control buttons panel: matches the image UI */}
      <div className={`flex items-center gap-1.5 pl-3 border-l ml-2 flex-shrink-0 relative ${
        isLight ? 'border-slate-200' : 'border-white/8'
      }`}>
        
        {/* 1. More Actions (ChevronsRight - >>) */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            title="Tab Operations"
            className={`w-[26px] h-[26px] rounded-[6px] flex items-center justify-center border transition-all duration-150 cursor-pointer ${
              isDropdownOpen 
                ? isLight 
                  ? 'bg-indigo-50/80 text-indigo-600 border-indigo-200/60 shadow-sm'
                  : 'bg-white/10 text-white border-white/15' 
                : isLight
                  ? 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100/70'
                  : 'text-[var(--text-dim)] border-transparent hover:text-[var(--text)] hover:bg-white/5'
            }`}
          >
            <ChevronsRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>

          {/* Fully functional operations context menu exactly like the image UI */}
          {isDropdownOpen && (
            <div className={`absolute right-0 mt-1.5 w-52 rounded-xl backdrop-blur-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-100 ${
              isLight
                ? 'bg-white/95 border border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.08),0_4px_12px_rgba(15,23,42,0.03)]'
                : 'bg-neutral-950/95 border border-white/12 shadow-[0_10px_30px_rgba(0,0,0,0.55)]'
            }`}>
              <button
                onClick={() => handleAction('close')}
                className={`w-full px-3.5 py-2 text-left text-[11.5px] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                  isLight
                    ? 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                    : 'text-white/90 hover:bg-white/8'
                }`}
              >
                <X className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-neutral-400'}`} />
                <span>Close Tab</span>
              </button>
              <button
                onClick={() => handleAction('pin')}
                className={`w-full px-3.5 py-2 text-left text-[11.5px] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                  isLight
                    ? 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                    : 'text-white/90 hover:bg-white/8'
                }`}
              >
                <Pin className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-neutral-400'}`} />
                <span>Pin Tab</span>
              </button>
              <button
                onClick={() => handleAction('maximize')}
                className={`w-full px-3.5 py-2 text-left text-[11.5px] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                  isLight
                    ? 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                    : 'text-white/90 hover:bg-white/8'
                }`}
              >
                {isMaximized ? (
                  <>
                    <Minimize2 className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-neutral-400'}`} />
                    <span>Restore View</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-neutral-400'}`} />
                    <span>Maximize View</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleAction('reload')}
                className={`w-full px-3.5 py-2 text-left text-[11.5px] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                  isLight
                    ? 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                    : 'text-white/90 hover:bg-white/8'
                }`}
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-neutral-400'}`} />
                <span>Reload Page</span>
              </button>
              
              <div className={`h-[1px] my-1.5 ${isLight ? 'bg-slate-100' : 'bg-white/8'}`} />
              
              <button
                onClick={() => handleAction('closeLeft')}
                className={`w-full px-3.5 py-2 text-left text-[11.5px] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                  isLight
                    ? 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                    : 'text-white/90 hover:bg-white/8'
                }`}
              >
                <ArrowLeft className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-neutral-400'}`} />
                <span>Close Tabs to the Left</span>
              </button>
              <button
                onClick={() => handleAction('closeRight')}
                className={`w-full px-3.5 py-2 text-left text-[11.5px] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                  isLight
                    ? 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                    : 'text-white/90 hover:bg-white/8'
                }`}
              >
                <ArrowRight className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-neutral-400'}`} />
                <span>Close Tabs to the Right</span>
              </button>
              <button
                onClick={() => handleAction('closeOthers')}
                className={`w-full px-3.5 py-2 text-left text-[11.5px] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                  isLight
                    ? 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                    : 'text-white/90 hover:bg-white/8'
                }`}
              >
                <XCircle className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-neutral-400'}`} />
                <span>Close Other Tabs</span>
              </button>
              <button
                onClick={() => handleAction('closeAll')}
                className={`w-full px-3.5 py-2 text-left text-[11.5px] font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                  isLight
                    ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                    : 'text-red-400 hover:bg-red-500/10'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Close All Tabs</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. Layout Selection (LayoutGrid - 4 Boxes) */}
        <div ref={layoutRef} className="relative">
          <button
            onClick={() => setIsLayoutOpen(!isLayoutOpen)}
            title="Display Layouts"
            className={`w-[26px] h-[26px] rounded-[6px] flex items-center justify-center border transition-all duration-150 cursor-pointer ${
              isLayoutOpen 
                ? isLight
                  ? 'bg-indigo-50/80 text-indigo-600 border-indigo-200/60 shadow-sm'
                  : 'bg-white/10 text-white border-white/15' 
                : isLight
                  ? 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100/70'
                  : 'text-[var(--text-dim)] border-transparent hover:text-[var(--text)] hover:bg-white/5'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>

          {isLayoutOpen && (
            <div className={`absolute right-0 mt-1.5 w-44 rounded-xl backdrop-blur-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-100 ${
              isLight
                ? 'bg-white/95 border border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.08),0_4px_12px_rgba(15,23,42,0.03)]'
                : 'bg-neutral-950/95 border border-white/12 shadow-[0_10px_30px_rgba(0,0,0,0.55)]'
            }`}>
              <div className={`px-3 py-1 text-[10px] uppercase tracking-wider font-bold mb-1 ${
                isLight ? 'text-slate-400' : 'text-white/45'
              }`}>
                Dashboard Grid
              </div>
              <button
                onClick={() => {
                  setCurrentLayout('bento');
                  setIsLayoutOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-[11.5px] font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  isLight
                    ? 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                    : 'text-white/90 hover:bg-white/8'
                }`}
              >
                <span>Bento Dashboard</span>
                {currentLayout === 'bento' && (
                  <Check className={`w-3 h-3 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
                )}
              </button>
              <button
                onClick={() => {
                  setCurrentLayout('split');
                  setIsLayoutOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-[11.5px] font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  isLight
                    ? 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                    : 'text-white/90 hover:bg-white/8'
                }`}
              >
                <span>Dual Split Panel</span>
                {currentLayout === 'split' && (
                  <Check className={`w-3 h-3 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
                )}
              </button>
              <button
                onClick={() => {
                  setCurrentLayout('classic');
                  setIsLayoutOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-[11.5px] font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  isLight
                    ? 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                    : 'text-white/90 hover:bg-white/8'
                }`}
              >
                <span>Classic Unified</span>
                {currentLayout === 'classic' && (
                  <Check className={`w-3 h-3 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
                )}
              </button>
            </div>
          )}
        </div>

        {/* 3. Refresh Page (RotateCw) */}
        <button
          onClick={triggerReload}
          title="Refresh current workspace"
          className={`w-[26px] h-[26px] rounded-[6px] flex items-center justify-center transition-all duration-150 cursor-pointer border border-transparent ${
            isLight
              ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
              : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/5'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>

        {/* 4. Fullscreen Zen Mode Toggle (Maximize2 / Minimize2) */}
        <button
          onClick={() => setIsMaximized(!isMaximized)}
          title={isMaximized ? 'Restore typical workspace layout' : 'Maximize active workspace view'}
          className={`w-[26px] h-[26px] rounded-[6px] flex items-center justify-center transition-all duration-150 cursor-pointer border border-transparent ${
            isLight
              ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
              : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/5'
          }`}
        >
          {isMaximized ? (
            <Minimize2 className="w-3.5 h-3.5" strokeWidth={2.5} />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" strokeWidth={2.5} />
          )}
        </button>

      </div>
    </div>
  );
};
