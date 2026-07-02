import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  APP_STORAGE_KEYS,
  DEFAULT_PREFERENCES,
  type UiLanguage,
  type UserPreferences,
} from '@vokop/shared';

interface SettingsState extends UserPreferences {
  setUiLanguage: (lang: UiLanguage) => void;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_PREFERENCES,
      setUiLanguage: (lang) => set({ uiLanguage: lang }),
      toggleTheme: () =>
        set({ colorTheme: get().colorTheme === 'light' ? 'dark' : 'light' }),
    }),
    { name: APP_STORAGE_KEYS.settings },
  ),
);
