import React from 'react';
import { ShoppingBag, AlertTriangle, CreditCard, Star, Info } from 'lucide-react';
import { Notification } from '../../types';

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  id?: string;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onClick,
  id,
}) => {
  const getIcon = () => {
    const iconSize = 'w-[17px] h-[17px]';
    switch (notification.type) {
      case 'order':
        return (
          <div className="w-9 h-9 rounded-lg bg-[var(--indigo-dim)] text-[var(--indigo)] flex items-center justify-center flex-shrink-0">
            <ShoppingBag className={iconSize} />
          </div>
        );
      case 'dispute':
        return (
          <div className="w-9 h-9 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className={iconSize} />
          </div>
        );
      case 'payout':
        return (
          <div className="w-9 h-9 rounded-lg bg-green-500/12 text-green-400 flex items-center justify-center flex-shrink-0">
            <CreditCard className={iconSize} />
          </div>
        );
      case 'review':
        return (
          <div className="w-9 h-9 rounded-lg bg-yellow-500/12 text-yellow-400 flex items-center justify-center flex-shrink-0">
            <Star className={iconSize} />
          </div>
        );
      case 'system':
      default:
        return (
          <div className="w-9 h-9 rounded-lg bg-white/5 text-[var(--text-mid)] flex items-center justify-center flex-shrink-0">
            <Info className={iconSize} />
          </div>
        );
    }
  };

  return (
    <div
      id={id}
      onClick={onClick}
      className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/4 transition-colors duration-150 ${
        notification.unread ? 'bg-[var(--indigo-dim)]/50' : 'bg-transparent'
      }`}
    >
      {getIcon()}
      <div className="flex-1 min-w-0">
        <div
          className={`text-[13px] truncate ${
            notification.unread ? 'text-white font-semibold' : 'text-[var(--text)]'
          }`}
        >
          {notification.title}
        </div>
        <div className="text-xs text-[var(--text-dim)] mt-0.5 line-clamp-2 leading-relaxed">
          {notification.desc}
        </div>
        <div className="text-[11px] text-[var(--text-dim)] mt-1.5">{notification.time}</div>
      </div>

      {notification.unread && (
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--indigo)] shadow-[0_0_6px_var(--indigo-glow)] flex-shrink-0 mt-1.5" />
      )}
    </div>
  );
};
