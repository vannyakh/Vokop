export type Theme = 'dark' | 'light' | 'dim';

export interface Role {
  id: string;
  name: string;
  status: 'enabled' | 'disabled';
  remark: string;
  created: string;
}

export interface Notification {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: 'order' | 'dispute' | 'payout' | 'review' | 'system';
  unread: boolean;
  dateGroup: 'Today' | 'Yesterday';
  details?: {
    buyer?: string;
    amount?: string;
    actionRequired?: boolean;
    deadline?: string;
    bankInfo?: string;
    rating?: number;
  };
}

export interface Tab {
  id: string;
  label: string;
  type: string; // e.g., 'dashboard', 'catalog', 'orders', 'wallet', 'roles'
}

export interface Settings {
  theme: Theme;
  storeName: string;
  currency: string;
  timeZone: string;
  showOutOfStock: boolean;
  autoAcceptReorders: boolean;
  notifyNewOrders: boolean;
  notifyDisputes: boolean;
  notifyPayouts: boolean;
  notifyMarketing: boolean;
  twoFactorAuth: boolean;
  transitionEnabled: boolean;
  transitionType: 'fade-blur' | 'slide' | 'fade' | 'zoom';
  transitionSpeed: 'slow' | 'normal' | 'fast';
}

export interface ColumnSetting {
  id: string;
  label: string;
  visible: boolean;
  pinned: boolean | 'left' | 'right';
}
