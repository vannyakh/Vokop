import { useEffect } from 'react';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorTheme = useSettingsStore((s) => s.colorTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorTheme);
    document.documentElement.classList.toggle('dark', colorTheme === 'dark');
  }, [colorTheme]);

  return children;
}
