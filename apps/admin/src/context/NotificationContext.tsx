import React, { createContext, useContext, useState } from 'react';
import { Notification } from '../types';
import { initialNotifications } from '../constants/mockData';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedNotif: Notification | null;
  setSelectedNotif: (notif: Notification | null) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  addNotification: (title: string, desc: string, type?: Notification['type']) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (selectedNotif?.id === id) {
      setSelectedNotif(null);
    }
  };

  const addNotification = (title: string, desc: string, type: Notification['type'] = 'system') => {
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title,
        desc,
        time: 'Just now',
        type,
        unread: true,
        dateGroup: 'Today',
      },
      ...prev,
    ]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isOpen,
        setIsOpen,
        selectedNotif,
        setSelectedNotif,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
