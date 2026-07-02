import React, { createContext, useContext, useState, useEffect } from 'react';
import { Settings, Theme } from '../types';
import { useTheme } from './ThemeContext';

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activePanel: string;
  setActivePanel: (panel: string) => void;
}

const defaultSettings: Settings = {
  theme: 'dark',
  storeName: 'VOK2Z Store',
  currency: 'USD / KHR',
  timeZone: 'Asia/Phnom_Penh',
  showOutOfStock: true,
  autoAcceptReorders: false,
  notifyNewOrders: true,
  notifyDisputes: true,
  notifyPayouts: false,
  notifyMarketing: false,
  twoFactorAuth: true,
  transitionEnabled: true,
  transitionType: 'fade-blur',
  transitionSpeed: 'normal',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<Settings>({
    ...defaultSettings,
    theme: theme,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('general');

  // Synchronize global theme changes into settings state
  useEffect(() => {
    setSettings((prev) => ({ ...prev, theme }));
  }, [theme]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    if (newSettings.theme && newSettings.theme !== theme) {
      setTheme(newSettings.theme);
    }
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        isOpen,
        setIsOpen,
        activePanel,
        setActivePanel,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
