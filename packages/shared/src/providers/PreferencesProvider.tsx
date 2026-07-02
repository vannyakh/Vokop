import { useEffect, type ReactNode } from 'react';
import type { ColorTheme } from '../types/preferences.js';

export interface PreferencesProviderProps {
  children: ReactNode;
  /** Current theme from your settings store */
  colorTheme: ColorTheme;
}

/** Applies user preference tokens to the document root. */
export function PreferencesProvider({ children, colorTheme }: PreferencesProviderProps) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorTheme);
    document.documentElement.classList.toggle('dark', colorTheme === 'dark');
  }, [colorTheme]);

  return children;
}
