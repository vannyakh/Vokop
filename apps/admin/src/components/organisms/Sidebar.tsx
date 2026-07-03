import React, { useState } from 'react';
import logoImg from '../../assets/logo.svg';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTabs } from '../../context/TabContext';
import { useSettings } from '../../context/SettingsContext';
import { useAdminConfig } from '../../context/AdminConfigContext';
import { Badge } from '../atoms/Badge';

interface SidebarProps {
  id?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ id }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const { openTab, activeTabId } = useTabs();
  const { setIsOpen: setSettingsOpen, setActivePanel } = useSettings();
  const { brand, nav: menuItems, mode, webAppUrl } = useAdminConfig();
  const navigate = useNavigate();

  // Floating states for collapsed mode
  const [hoveredItem, setHoveredItem] = useState<{
    id: string;
    rect: DOMRect;
    label: string;
    isGroup?: boolean;
    subItems?: { label: string; tabId: string; type: string }[];
  } | null>(null);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    setHoveredItem(null);
  };

  const handleGroupClick = (groupName: string) => {
    if (isCollapsed) return;
    setOpenGroup(openGroup === groupName ? null : groupName);
  };

  const brandLogo = brand.logoSrc ?? logoImg;

  const goToPath = (path?: string) => {
    if (path) navigate(path);
  };

  const handleItemClick = (item: (typeof menuItems)[number]['items'][number]) => {
    if (item.id === 'settings') {
      setActivePanel('general');
      setSettingsOpen(true);
      return;
    }

    if (mode === 'router' && item.path) {
      goToPath(item.path);
      return;
    }

    openTab(item.id, item.label, item.type);
  };

  const handleSubItemClick = (
    sub: NonNullable<(typeof menuItems)[number]['items'][number]['subItems']>[number],
    groupLabel: string,
  ) => {
    if (mode === 'router' && sub.path) {
      goToPath(sub.path);
      return;
    }

    openTab(sub.tabId, `${groupLabel} — ${sub.label}`, sub.type);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement | HTMLButtonElement>, item: any) => {
    if (!isCollapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredItem({
      id: item.id,
      rect,
      label: item.label,
      isGroup: item.isGroup,
      subItems: item.subItems,
    });
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  return (
    <div
      id={id}
      className={`relative z-50 flex flex-col h-screen select-none border-r border-white/8 shadow-md transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[76px]' : 'w-[264px]'
      }`}
      style={{
        background: 'color-mix(in srgb, var(--c-glass) var(--glass-bg-alpha), transparent)',
        backdropFilter: 'blur(18px) saturate(160%)',
      }}
    >
      {/* Brand Header */}
      <div className="relative flex items-center gap-2.5 h-16 px-[18px] border-b border-white/8 flex-shrink-0">
        <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img
            src={brandLogo}
            alt={brand.logoAlt ?? 'Admin logo'}
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <div
          className={`text-base font-bold tracking-wide text-[var(--text)] whitespace-nowrap overflow-hidden transition-opacity duration-200 ${
            isCollapsed ? 'opacity-0 w-0' : 'opacity-100'
          }`}
        >
          {brand.name}
          {brand.highlight ? (
            <span className="text-[var(--gold)]"> {brand.highlight}</span>
          ) : null}
        </div>

        {/* Collapse Button */}
        <button
          onClick={toggleCollapse}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text-mid)] hover:text-[var(--text)] hover:border-[var(--indigo)] flex items-center justify-center cursor-pointer z-30 transition-colors duration-150 shadow-sm"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.25 h-3.25" />
          ) : (
            <ChevronLeft className="w-3.25 h-3.25" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <div className={`flex-1 overflow-y-auto py-2 scrollbar-none transition-all duration-200 ${
        isCollapsed ? 'px-2 space-y-1' : 'px-3 space-y-4'
      }`}>
        {menuItems.map((sec, secIdx) => (
          <div key={secIdx} className={`transition-all duration-200 ${isCollapsed ? 'space-y-0.5' : 'space-y-1'}`}>
            {/* Section label */}
            {isCollapsed ? (
              <div className="mx-auto my-0.5 w-6 h-[1px] bg-white/10" />
            ) : (
              <div className="text-[10px] font-bold tracking-[1.5px] text-[var(--text-dim)] px-2.5 pt-3.5 pb-1.5 uppercase select-none opacity-80">
                {sec.category}
              </div>
            )}

            {/* Section Items */}
            {sec.items.map((item) => {
              const isGroupActive =
                item.isGroup &&
                item.subItems?.some((sub) => activeTabId === sub.tabId);
              const isItemActive = activeTabId === item.id || isGroupActive;

              if (item.isGroup) {
                const isGroupOpen = openGroup === item.id;
                return (
                  <div key={item.id} className="relative">
                    <button
                      onClick={() => handleGroupClick(item.id)}
                      onMouseEnter={(e) => handleMouseEnter(e, item)}
                      onMouseLeave={handleMouseLeave}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl text-left text-[13.5px] font-medium transition-all duration-200 cursor-pointer ${
                        isCollapsed ? 'justify-center p-1.5' : ''
                      } ${
                        isGroupActive
                          ? isCollapsed
                            ? 'text-[var(--sidebar-active-text)]'
                            : 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] shadow-sm ring-1 ring-[var(--sidebar-active-ring)]'
                          : `text-[var(--text-mid)] ${isCollapsed ? 'hover:bg-transparent hover:text-white' : 'hover:bg-white/4 hover:text-[var(--text)]'}`
                      }`}
                    >
                      <div
                        className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                          isGroupActive 
                            ? 'bg-[var(--indigo)] text-white shadow-[0_0_12px_var(--indigo-glow)]' 
                            : `text-[var(--text-dim)] ${isCollapsed ? 'bg-transparent' : 'bg-white/3'}`
                        }`}
                      >
                        {item.icon}
                      </div>
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && <Badge>{item.badge}</Badge>}
                          <ChevronRight
                            className={`w-3.5 h-3.5 text-[var(--text-dim)] transition-transform duration-200 ${
                              isGroupOpen ? 'rotate-90 text-[var(--text)]' : ''
                            }`}
                            strokeWidth={2.5}
                          />
                        </>
                      )}
                    </button>

                    {/* Submenu List */}
                    {!isCollapsed && isGroupOpen && (
                      <div className="mt-1.5 space-y-1.5 pl-4.5 border-l border-[color-mix(in_srgb,var(--text-dim)_18%,transparent)] ml-5.5">
                        {item.subItems?.map((sub) => {
                          const isSubActive = activeTabId === sub.tabId;
                          return (
                            <button
                              key={sub.tabId}
                              onClick={() => handleSubItemClick(sub, item.label)}
                              className={`w-full flex items-center gap-3 py-1.5 pl-3 pr-2.5 rounded-lg text-left text-xs cursor-pointer transition-all duration-200 group/sub hover:translate-x-1 ${
                                isSubActive
                                  ? 'text-[var(--sidebar-active-text)] bg-[var(--sidebar-active-bg)] font-semibold'
                                  : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/3'
                              }`}
                            >
                              <span 
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-200 ${
                                  isSubActive 
                                    ? 'bg-[var(--indigo)] shadow-[0_0_8px_rgba(99,102,241,0.5)] scale-125' 
                                    : 'bg-[color-mix(in_srgb,var(--text-dim)_35%,transparent)] group-hover/sub:bg-[var(--text-mid)] group-hover/sub:scale-110'
                                }`} 
                              />
                              <span className="truncate tracking-wide text-[11.5px]">{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  onMouseEnter={(e) => handleMouseEnter(e, item)}
                  onMouseLeave={handleMouseLeave}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl text-left text-[13.5px] font-medium transition-all duration-200 cursor-pointer ${
                    isCollapsed ? 'justify-center p-1.5' : ''
                  } ${
                    isItemActive
                      ? isCollapsed
                        ? 'text-[var(--sidebar-active-text)]'
                        : 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] shadow-sm ring-1 ring-[var(--sidebar-active-ring)]'
                      : `text-[var(--text-mid)] ${isCollapsed ? 'hover:bg-transparent hover:text-white' : 'hover:bg-white/4 hover:text-[var(--text)]'}`
                  }`}
                >
                  <div
                    className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                      isItemActive 
                        ? 'bg-[var(--indigo)] text-white shadow-[0_0_12px_var(--indigo-glow)]' 
                        : `text-[var(--text-dim)] ${isCollapsed ? 'bg-transparent' : 'bg-white/3'}`
                    }`}
                  >
                    {item.icon}
                  </div>
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && <Badge>{item.badge}</Badge>}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Support Links */}
      <div className={`border-t border-white/8 flex-shrink-0 transition-all duration-200 ${isCollapsed ? 'p-1.5 space-y-0.5' : 'p-3 space-y-1'}`}>
        {webAppUrl ? (
          <a
            href={webAppUrl}
            className={`flex items-center gap-3 p-2 rounded-[10px] text-[13px] text-[var(--text-mid)] transition-all duration-150 cursor-pointer ${
              isCollapsed
                ? 'justify-center p-1.5 hover:bg-transparent hover:text-white'
                : 'hover:bg-white/4 hover:text-[var(--text)]'
            }`}
          >
            <div className="w-7.5 h-7.5 rounded-lg flex items-center justify-center text-[var(--text-dim)] flex-shrink-0">
              <ExternalLink className="w-4 h-4" />
            </div>
            {!isCollapsed && <span className="flex-1 truncate">Back to Vokop</span>}
          </a>
        ) : null}
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className={`flex items-center gap-3 p-2 rounded-[10px] text-[13px] text-[var(--text-mid)] transition-all duration-150 cursor-pointer ${
            isCollapsed 
              ? 'justify-center p-1.5 hover:bg-transparent hover:text-white' 
              : 'hover:bg-white/4 hover:text-[var(--text)]'
          }`}
        >
          <div className="w-7.5 h-7.5 rounded-lg flex items-center justify-center text-[var(--text-dim)] flex-shrink-0">
            <HelpCircle className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <>
              <span className="flex-1 truncate">Help Center</span>
              <ExternalLink className="w-3.25 h-3.25 text-[var(--text-dim)] opacity-60" />
            </>
          )}
        </a>
      </div>

      {/* ── Collapsed Mode Floating Flyout & Tooltips ── */}
      {isCollapsed && hoveredItem && (
        <div
          className="fixed z-[9999] pl-2.5 pb-2.5"
          style={{
            left: hoveredItem.rect.right - 4,
            top: hoveredItem.rect.top - 4,
            minWidth: hoveredItem.isGroup ? '214px' : 'auto',
          }}
          onMouseEnter={() =>
            setHoveredItem(hoveredItem) /* Keep it visible during hover over flyout */
          }
          onMouseLeave={handleMouseLeave}
        >
          <div className="bg-[var(--panel-solid)]/95 border border-[var(--border)] rounded-xl p-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.35),0_0_12px_var(--indigo-dim)] backdrop-blur-xl animate-flyout">
            {hoveredItem.isGroup ? (
              <div className="space-y-1.5 select-none">
                <div className="text-[10px] font-bold tracking-[1.2px] uppercase text-[var(--text-dim)] pb-2 mb-1.5 border-b border-[var(--border)] px-1.5 opacity-80">
                  {hoveredItem.label}
                </div>
                {hoveredItem.subItems?.map((sub) => {
                  const isSubActive = activeTabId === sub.tabId;
                  return (
                    <button
                      key={sub.tabId}
                      onClick={() => {
                        handleSubItemClick(sub, hoveredItem.label);
                        setHoveredItem(null);
                      }}
                      className={`w-full flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg text-left text-xs transition-all duration-150 cursor-pointer ${
                        isSubActive
                          ? 'text-[var(--sidebar-active-text)] bg-[var(--sidebar-active-bg)] font-semibold'
                          : 'text-[var(--text-mid)] hover:bg-white/6 hover:text-white'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-150 ${isSubActive ? 'bg-[var(--indigo)] shadow-[0_0_8px_var(--indigo)] scale-110' : 'bg-white/20'}`} />
                      <span className="truncate">{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-[var(--text)] font-semibold whitespace-nowrap px-2.5 py-0.5 select-none">
                {hoveredItem.label}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
