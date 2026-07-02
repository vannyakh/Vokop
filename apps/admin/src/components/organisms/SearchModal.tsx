import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Search,
  LayoutDashboard,
  ShieldCheck,
  Tag,
  Package,
  CheckSquare,
  AlertTriangle,
  Wallet,
  Receipt,
  MessageSquare,
  Star,
  Store,
  Palette,
  Key,
  Users,
  History,
  Settings,
  Sun,
  Sparkles,
  Moon,
  Plus,
  Bell,
  Shield,
  CornerDownLeft,
  Command,
  X
} from 'lucide-react';
import { useSearchModal } from '../../context/SearchModalContext';
import { useTabs } from '../../context/TabContext';
import { useTheme } from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { useNotifications } from '../../context/NotificationContext';

// Icon Map helper
const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="w-4 h-4" />,
  ShieldCheck: <ShieldCheck className="w-4 h-4" />,
  Tag: <Tag className="w-4 h-4" />,
  Package: <Package className="w-4 h-4" />,
  CheckSquare: <CheckSquare className="w-4 h-4" />,
  AlertTriangle: <AlertTriangle className="w-4 h-4" />,
  Wallet: <Wallet className="w-4 h-4" />,
  Receipt: <Receipt className="w-4 h-4" />,
  MessageSquare: <MessageSquare className="w-4 h-4" />,
  Star: <Star className="w-4 h-4" />,
  Store: <Store className="w-4 h-4" />,
  Palette: <Palette className="w-4 h-4" />,
  Key: <Key className="w-4 h-4" />,
  Users: <Users className="w-4 h-4" />,
  History: <History className="w-4 h-4" />,
  Settings: <Settings className="w-4 h-4" />,
  Sun: <Sun className="w-4 h-4" />,
  Sparkles: <Sparkles className="w-4 h-4" />,
  Moon: <Moon className="w-4 h-4" />,
  Plus: <Plus className="w-4 h-4" />,
  Bell: <Bell className="w-4 h-4" />,
  Shield: <Shield className="w-4 h-4" />
};

export const SearchModal: React.FC = () => {
  const { isOpen, setIsOpen } = useSearchModal();
  const { openTab, addEmptyTab } = useTabs();
  const { theme, toggleTheme, setTheme } = useTheme();
  const { setIsOpen: setSettingsOpen, setActivePanel } = useSettings();
  const { setIsOpen: setNotifOpen } = useNotifications();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const searchItems = [
    // --- Navigation ---
    {
      id: 'nav-dashboard',
      label: 'Dashboard Overview',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'LayoutDashboard',
      action: () => openTab('dashboard', 'Dashboard', 'dashboard'),
    },
    {
      id: 'nav-verification',
      label: 'KYC Identity Verification',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'ShieldCheck',
      action: () => openTab('verification', 'Verification', 'verification'),
    },
    {
      id: 'nav-gamekeys',
      label: 'Catalog — Game keys Listings',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'Tag',
      action: () => openTab('catalog', 'Catalog — Game keys', 'catalog'),
    },
    {
      id: 'nav-giftcards',
      label: 'Catalog — Gift cards Listings',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'Tag',
      action: () => openTab('giftcards', 'Catalog — Gift cards', 'catalog'),
    },
    {
      id: 'nav-recharge',
      label: 'Catalog — Top-up & recharge',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'Tag',
      action: () => openTab('recharge', 'Catalog — Top-up', 'catalog'),
    },
    {
      id: 'nav-bulkupload',
      label: 'Catalog — Bulk CSV upload',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'Tag',
      action: () => openTab('bulkupload', 'Catalog — Bulk upload', 'catalog'),
    },
    {
      id: 'nav-stock',
      label: 'Stock & Automatic Delivery Feed',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'Package',
      action: () => openTab('stock', 'Stock & Delivery', 'catalog'),
    },
    {
      id: 'nav-orders',
      label: 'Orders — All order feed',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'CheckSquare',
      action: () => openTab('orders', 'Orders', 'orders'),
    },
    {
      id: 'nav-awaiting',
      label: 'Orders — Awaiting delivery',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'CheckSquare',
      action: () => openTab('awaiting', 'Orders — Awaiting', 'orders'),
    },
    {
      id: 'nav-completed',
      label: 'Orders — Completed shipments',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'CheckSquare',
      action: () => openTab('completed', 'Orders — Completed', 'orders'),
    },
    {
      id: 'nav-refunds',
      label: 'Orders — Active refunds list',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'CheckSquare',
      action: () => openTab('refunds', 'Orders — Refunds', 'orders'),
    },
    {
      id: 'nav-disputes',
      label: 'Disputes & Claims Panel',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'AlertTriangle',
      action: () => openTab('disputes', 'Disputes', 'orders'),
    },
    {
      id: 'nav-balance',
      label: 'Wallet & Payouts — Balance overview',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'Wallet',
      action: () => openTab('wallet', 'Wallet & Payouts', 'wallet'),
    },
    {
      id: 'nav-withdraw',
      label: 'Wallet & Payouts — Request withdraw',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'Wallet',
      action: () => openTab('withdraw', 'Wallet — Withdraw', 'wallet'),
    },
    {
      id: 'nav-payouts',
      label: 'Wallet & Payouts — Payout history log',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'Wallet',
      action: () => openTab('payouts', 'Wallet — Payouts', 'wallet'),
    },
    {
      id: 'nav-transactions',
      label: 'Transactions audit journal',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'Receipt',
      action: () => openTab('transactions', 'Transactions', 'wallet'),
    },
    {
      id: 'nav-messages',
      label: 'Messages & Customer Chat',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'MessageSquare',
      action: () => openTab('messages', 'Messages', 'dashboard'),
    },
    {
      id: 'nav-reviews',
      label: 'Reviews & Feedback moderation',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'Star',
      action: () => openTab('reviews', 'Reviews', 'dashboard'),
    },
    {
      id: 'nav-profile',
      label: 'Shop Public Profile settings',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'Store',
      action: () => openTab('profile', 'Shop Profile', 'dashboard'),
    },
    {
      id: 'nav-cms',
      label: 'Storefront CMS theme builder',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'Palette',
      action: () => openTab('cms', 'Storefront CMS', 'dashboard'),
    },
    {
      id: 'nav-api',
      label: 'API Keys & Webhooks',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'Key',
      action: () => openTab('api', 'API Keys', 'dashboard'),
    },
    {
      id: 'nav-uishowcase',
      label: 'UI Libraries Hub (shadcn/ui & Ant Design)',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'Palette',
      action: () => openTab('uishowcase', 'UI Libraries', 'uishowcase'),
    },
    {
      id: 'nav-roles',
      label: 'Roles & Permissions management',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'Users',
      action: () => openTab('catalog', 'Catalog — Game keys', 'catalog'),
    },
    {
      id: 'nav-activity',
      label: 'System Activity Log',
      category: 'Pages & Views',
      type: 'nav',
      iconName: 'History',
      action: () => openTab('activity', 'Activity Log', 'dashboard'),
    },

    // --- Quick Actions ---
    {
      id: 'act-theme-light',
      label: 'Switch to Clean Light Theme',
      category: 'Quick Actions',
      type: 'action',
      iconName: 'Sun',
      action: () => setTheme('light'),
    },
    {
      id: 'act-theme-dim',
      label: 'Switch to Indigo Dim Theme',
      category: 'Quick Actions',
      type: 'action',
      iconName: 'Sparkles',
      action: () => setTheme('dim'),
    },
    {
      id: 'act-theme-dark',
      label: 'Switch to Cosmic Dark Theme',
      category: 'Quick Actions',
      type: 'action',
      iconName: 'Moon',
      action: () => setTheme('dark'),
    },
    {
      id: 'act-add-tab',
      label: 'Create Custom Playground Tab',
      category: 'Quick Actions',
      type: 'action',
      iconName: 'Plus',
      action: () => addEmptyTab(),
    },
    {
      id: 'act-open-settings',
      label: 'Open General Store Settings Drawer',
      category: 'Quick Actions',
      type: 'action',
      iconName: 'Settings',
      action: () => {
        setSettingsOpen(true);
        setActivePanel('general');
      },
    },
    {
      id: 'act-open-notif',
      label: 'Open Live Notifications panel',
      category: 'Quick Actions',
      type: 'action',
      iconName: 'Bell',
      action: () => setNotifOpen(true),
    },

    // --- System Roles / Data ---
    {
      id: 'role-owner',
      label: 'Store Owner (Full Administrative Permission)',
      category: 'System Roles',
      type: 'role',
      iconName: 'Shield',
      action: () => openTab('catalog', 'Catalog — Game keys', 'catalog'),
    },
    {
      id: 'role-order',
      label: 'Order Manager (Handles Shipments & Disputes)',
      category: 'System Roles',
      type: 'role',
      iconName: 'Shield',
      action: () => openTab('catalog', 'Catalog — Game keys', 'catalog'),
    },
    {
      id: 'role-support',
      label: 'Support Agent (Handles messages, Read-only)',
      category: 'System Roles',
      type: 'role',
      iconName: 'Shield',
      action: () => openTab('catalog', 'Catalog — Game keys', 'catalog'),
    },
    {
      id: 'role-finance',
      label: 'Finance Viewer (Views withdrawals & balance logs)',
      category: 'System Roles',
      type: 'role',
      iconName: 'Shield',
      action: () => openTab('catalog', 'Catalog — Game keys', 'catalog'),
    },
    {
      id: 'role-editor',
      label: 'Listing Editor (Drafts catalog keys & gift cards)',
      category: 'System Roles',
      type: 'role',
      iconName: 'Shield',
      action: () => openTab('catalog', 'Catalog — Game keys', 'catalog'),
    },
    {
      id: 'role-integrator',
      label: 'API Integrator (Service account for stock delivery)',
      category: 'System Roles',
      type: 'role',
      iconName: 'Shield',
      action: () => openTab('catalog', 'Catalog — Game keys', 'catalog'),
    },
    {
      id: 'role-moderator',
      label: 'Moderator (Reviews reported comments and bans)',
      category: 'System Roles',
      type: 'role',
      iconName: 'Shield',
      action: () => openTab('catalog', 'Catalog — Game keys', 'catalog'),
    },
    {
      id: 'role-billing',
      label: 'Billing Admin (Processes card profiles & tax profiles)',
      category: 'System Roles',
      type: 'role',
      iconName: 'Shield',
      action: () => openTab('catalog', 'Catalog — Game keys', 'catalog'),
    }
  ];

  // Filters based on search query (case insensitive search)
  const filteredItems = query.trim() === ''
    ? searchItems.slice(0, 6) // default suggestions
    : searchItems.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      );

  // Reset selection index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle arrow key navigation & Enter inside modal
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      scrollIntoView((selectedIndex + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      scrollIntoView((selectedIndex - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleItemTrigger(filteredItems[selectedIndex]);
      }
    }
  };

  const scrollIntoView = (index: number) => {
    const el = resultsRef.current;
    if (el) {
      const activeNode = el.childNodes[index] as HTMLElement;
      if (activeNode) {
        activeNode.scrollIntoView({ block: 'nearest' });
      }
    }
  };

  const handleItemTrigger = (item: typeof searchItems[0]) => {
    item.action();
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-[10vh] px-4">
          {/* Backdrop Blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Dialog Body */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative w-full max-w-xl bg-[var(--panel-solid)] border border-[var(--border)] rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden"
          >
            {/* Search Input Area */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)] relative">
              <Search className="w-5 h-5 text-[var(--text-dim)] flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search views, actions, roles... (Type anything)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder-[var(--text-dim)] outline-none border-none font-medium h-6 w-full"
              />
              {/* Close Button or Escape Hint */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] font-bold tracking-wider text-[var(--text-dim)] uppercase bg-white/5 border border-white/8 px-1.5 py-0.5 rounded select-none">
                  ESC
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-[var(--text-dim)] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Recommended Tag Shortcuts */}
            {query.trim() === '' && (
              <div className="px-4.5 py-2 bg-white/2 border-b border-[var(--border)] flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mr-1 whitespace-nowrap select-none">
                  Quick recommendations:
                </span>
                <button
                  onClick={() => setQuery('theme')}
                  className="text-[11px] font-semibold text-[var(--text-mid)] hover:text-[var(--text)] hover:bg-white/5 bg-white/2 px-2 py-0.5 rounded-full border border-white/5 transition-all whitespace-nowrap cursor-pointer"
                >
                  Theme Toggle
                </button>
                <button
                  onClick={() => setQuery('order')}
                  className="text-[11px] font-semibold text-[var(--text-mid)] hover:text-[var(--text)] hover:bg-white/5 bg-white/2 px-2 py-0.5 rounded-full border border-white/5 transition-all whitespace-nowrap cursor-pointer"
                >
                  Orders
                </button>
                <button
                  onClick={() => setQuery('roles')}
                  className="text-[11px] font-semibold text-[var(--text-mid)] hover:text-[var(--text)] hover:bg-white/5 bg-white/2 px-2 py-0.5 rounded-full border border-white/5 transition-all whitespace-nowrap cursor-pointer"
                >
                  Roles
                </button>
              </div>
            )}

            {/* Results list */}
            <div
              ref={resultsRef}
              className="max-h-[360px] overflow-y-auto p-2 space-y-0.5 scrollbar-none"
            >
              {filteredItems.length > 0 ? (
                filteredItems.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemTrigger(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer transition-all duration-150 select-none ${
                        isSelected
                          ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] ring-1 ring-[var(--sidebar-active-ring)]'
                          : 'text-[var(--text-mid)] hover:bg-white/3 hover:text-[var(--text)]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Icon */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? 'bg-[var(--indigo)] text-white shadow-[0_0_12px_var(--indigo-glow)]'
                              : 'bg-white/4 text-[var(--text-dim)]'
                          }`}
                        >
                          {iconMap[item.iconName] || <Search className="w-4 h-4" />}
                        </div>
                        {/* Labels */}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate leading-tight">
                            {item.label}
                          </p>
                          <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mt-0.5 select-none opacity-70">
                            {item.category}
                          </p>
                        </div>
                      </div>

                      {/* Action shortcut icon */}
                      {isSelected && (
                        <div className="flex items-center gap-1.5 flex-shrink-0 animate-fade-in text-[var(--text-dim)]">
                          <span className="text-[10px] font-bold tracking-wider select-none opacity-80">
                            Navigate
                          </span>
                          <CornerDownLeft className="w-3.5 h-3.5 opacity-80" />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-12 px-4 text-center select-none">
                  <AlertTriangle className="w-8 h-8 text-[var(--text-dim)] mx-auto mb-2.5 opacity-60" />
                  <p className="text-xs font-semibold text-[var(--text-mid)]">
                    No results found for &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-[11px] text-[var(--text-dim)] mt-1">
                    Try typing Dashboard, Withdraw, Theme, Store Owner, or Settings instead.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Keyboard Guide Bar */}
            <div className="px-4.5 py-3 bg-white/2 border-t border-[var(--border)] flex items-center justify-between text-[10.5px] font-semibold text-[var(--text-dim)] select-none">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="border border-white/10 bg-white/4 px-1 py-0.5 rounded text-[9px] font-bold">↑↓</span>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <span className="border border-white/10 bg-white/4 px-1.5 py-0.5 rounded text-[9px] font-bold">Enter</span>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <span className="border border-white/10 bg-white/4 px-1 py-0.5 rounded text-[9px] font-bold">Esc</span>
                  Close
                </span>
              </div>
              <div className="flex items-center gap-1 font-bold text-[var(--text-dim)]">
                <Command className="w-3 h-3" />
                <span>K to open anywhere</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
