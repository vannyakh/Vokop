import React, { useState } from 'react';
import { X, ArrowLeft, Check } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { Notification } from '../../types';
import { NotificationItem } from '../molecules/NotificationItem';

interface NotificationOverlayProps {
  id?: string;
}

type FilterType = 'all' | 'unread' | 'order' | 'dispute' | 'payout';

export const NotificationOverlay: React.FC<NotificationOverlayProps> = ({ id }) => {
  const {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    selectedNotif,
    setSelectedNotif,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  if (!isOpen) return null;

  const filters: { val: FilterType; label: string; idx: number }[] = [
    { val: 'all', label: 'All', idx: 0 },
    { val: 'unread', label: 'Unread', idx: 1 },
    { val: 'order', label: 'Orders', idx: 2 },
    { val: 'dispute', label: 'Disputes', idx: 3 },
    { val: 'payout', label: 'Finance', idx: 4 },
  ];

  const activeFilterIdx = filters.find((f) => f.val === activeFilter)?.idx ?? 0;

  const filteredNotifications = notifications.filter((notif) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return notif.unread;
    return notif.type === activeFilter;
  });

  const todayNotifs = filteredNotifications.filter((n) => n.dateGroup === 'Today');
  const yesterdayNotifs = filteredNotifications.filter((n) => n.dateGroup === 'Yesterday');

  const handleItemClick = (notif: Notification) => {
    markAsRead(notif.id);
    setSelectedNotif(notif);
  };

  const handleDismissDetail = () => {
    if (selectedNotif) {
      deleteNotification(selectedNotif.id);
      setSelectedNotif(null);
    }
  };

  return (
    <div
      id={id}
      className="fixed inset-0 bg-[#050508]/65 backdrop-blur-[3px] flex items-center justify-center p-6 z-[190]"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div
        id="notifModal"
        className={`w-[420px] max-w-full h-[560px] bg-[#16161f] border border-[var(--border)] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.65),0_8px_24px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden transition-all duration-300 relative ${
          selectedNotif ? 'show-detail' : ''
        }`}
      >
        {/* Header Block */}
        <div className="h-14.5 px-4.5 border-b border-[var(--border)] flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-2">
            {selectedNotif ? (
              <button
                onClick={() => setSelectedNotif(null)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-mid)] hover:text-[var(--text)] transition-colors duration-150 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <>
                <h3 className="text-[15px] font-bold text-[var(--text)] select-none">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white font-bold text-[10.5px] rounded-full px-1.5 py-0.5 animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!selectedNotif && unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[var(--indigo)] font-semibold hover:text-indigo-400 cursor-pointer select-none"
              >
                Mark all as read
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="w-7.5 h-7.5 rounded-full border border-[var(--border)] bg-white/2 hover:bg-white/5 text-[var(--text-mid)] hover:text-[var(--text)] hover:border-[var(--indigo)] flex items-center justify-center cursor-pointer transition-colors duration-150"
            >
              <X className="w-3.25 h-3.25" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* LIST VIEW PANEL */}
        {!selectedNotif ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Sliding segment filters bar */}
            <div className="p-3 pb-2 flex-shrink-0">
              <div
                className="relative flex items-center w-full p-1 rounded-full bg-black/28 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_2px_6px_rgba(0,0,0,0.4)] overflow-hidden isolation-isolate select-none"
                style={{
                  backdropFilter: 'blur(10px) saturate(160%)',
                }}
              >
                {/* Slit bubble container with goo merger filter */}
                <div
                  className="absolute top-1 bottom-1 left-1 rounded-full bg-[var(--indigo)] opacity-90 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] z-0"
                  style={{
                    width: 'calc((100% - 8px) / 5)',
                    transform: `translateX(calc(${activeFilterIdx} * 100%))`,
                    boxShadow: '0 2px 10px rgba(99,102,241,0.25), 0 1px 3px rgba(0,0,0,0.3)',
                  }}
                />

                {filters.map((f) => (
                  <button
                    key={f.val}
                    onClick={() => setActiveFilter(f.val)}
                    className={`flex-1 relative z-10 flex items-center justify-center h-7.5 rounded-full text-xs font-semibold cursor-pointer border-none outline-none select-none transition-colors duration-200 ${
                      activeFilter === f.val ? 'text-white' : 'text-[var(--text-dim)] hover:text-[var(--text-mid)]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrolling list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3.5 scrollbar-thin scrollbar-transparent">
              {filteredNotifications.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--text-dim)] select-none">
                  No notifications found.
                </div>
              ) : (
                <>
                  {todayNotifs.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10.5px] font-bold tracking-[0.8px] text-[var(--text-dim)] uppercase px-2">
                        Today
                      </div>
                      {todayNotifs.map((n) => (
                        <NotificationItem
                          key={n.id}
                          notification={n}
                          onClick={() => handleItemClick(n)}
                        />
                      ))}
                    </div>
                  )}

                  {yesterdayNotifs.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-[10.5px] font-bold tracking-[0.8px] text-[var(--text-dim)] uppercase px-2">
                        Yesterday
                      </div>
                      {yesterdayNotifs.map((n) => (
                        <NotificationItem
                          key={n.id}
                          notification={n}
                          onClick={() => handleItemClick(n)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer triggers */}
            <div className="p-3 border-t border-[var(--border)] text-center flex-shrink-0">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Navigate to full notifications center...');
                }}
                className="text-xs font-bold text-[var(--indigo)] hover:text-indigo-400 select-none hover:underline"
              >
                View all notifications
              </a>
            </div>
          </div>
        ) : (
          /* DETAILS SCREEN PANEL */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-transparent">
              <div className="text-sm font-bold text-[var(--text)] mb-1">
                {selectedNotif.title}
              </div>
              <div className="text-[11px] text-[var(--text-dim)] mb-3 select-none">
                {selectedNotif.time}
              </div>
              <p className="text-xs text-[var(--text-mid)] leading-relaxed bg-white/2 p-3 border border-white/5 rounded-xl">
                {selectedNotif.desc}
              </p>

              {/* Dynamic Metadata Block */}
              {selectedNotif.details && (
                <div className="bg-white/[0.015] border border-[var(--border)] rounded-xl p-3.5 space-y-2.5">
                  {selectedNotif.details.buyer && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-dim)]">Buyer Account</span>
                      <span className="text-[var(--text)] font-semibold">
                        {selectedNotif.details.buyer}
                      </span>
                    </div>
                  )}
                  {selectedNotif.details.amount && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-dim)]">Amount</span>
                      <span className="text-white font-bold">{selectedNotif.details.amount}</span>
                    </div>
                  )}
                  {selectedNotif.details.deadline && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-dim)]">Fulfillment SLA</span>
                      <span className="text-[var(--text)] font-semibold">
                        {selectedNotif.details.deadline}
                      </span>
                    </div>
                  )}
                  {selectedNotif.details.bankInfo && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-dim)]">Bank Target</span>
                      <span className="text-[var(--text)] font-semibold">
                        {selectedNotif.details.bankInfo}
                      </span>
                    </div>
                  )}
                  {selectedNotif.details.rating && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-dim)]">Buyer Rating</span>
                      <span className="text-amber-400 font-bold">
                        {'★'.repeat(selectedNotif.details.rating)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Detail footer CTA action row */}
            <div className="p-3.5 px-4.5 border-t border-[var(--border)] flex items-center justify-end gap-2.5 flex-shrink-0 bg-black/15">
              <button
                onClick={handleDismissDetail}
                className="px-4.5 py-1.75 border border-[var(--border)] rounded-lg text-xs font-semibold text-[var(--text-mid)] hover:text-red-400 hover:border-red-400/30 cursor-pointer transition-all duration-150"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  alert(`Navigating to target resource for message: ${selectedNotif.id}`);
                  setIsOpen(false);
                }}
                className="px-4.5 py-1.75 bg-[var(--indigo)] hover:bg-[#5558e0] rounded-lg text-xs font-bold text-white cursor-pointer transition-all duration-150"
              >
                View Details
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
