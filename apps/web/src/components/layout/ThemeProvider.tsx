import { ThemeProvider as SharedThemeProvider } from '@vokop/ui/antd';
import { PreferencesProvider } from '@vokop/shared/providers';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';


export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorTheme = useSettingsStore((s) => s.colorTheme);

  return (
    <PreferencesProvider colorTheme={colorTheme}>
      <SharedThemeProvider theme={colorTheme} applyDocumentTheme>
        {children}
      </SharedThemeProvider>
    </PreferencesProvider>
  );
}
