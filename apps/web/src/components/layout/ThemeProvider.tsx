import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { PreferencesProvider } from '@vokop/shared/providers';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorTheme = useSettingsStore((s) => s.colorTheme);
  return <PreferencesProvider colorTheme={colorTheme}>{children}</PreferencesProvider>;
}
