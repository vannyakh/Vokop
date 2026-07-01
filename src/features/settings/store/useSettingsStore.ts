import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ColorTheme, UiLanguage } from '@/features/settings/constants/i18n';

interface SettingsState {
  uiLanguage: UiLanguage;
  colorTheme: ColorTheme;
  setUiLanguage: (lang: UiLanguage) => void;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      uiLanguage: 'en',
      colorTheme: 'dark',
      setUiLanguage: (lang) => set({ uiLanguage: lang }),
      toggleTheme: () =>
        set({ colorTheme: get().colorTheme === 'light' ? 'dark' : 'light' }),
    }),
    { name: 'vokop-settings' },
  ),
);
