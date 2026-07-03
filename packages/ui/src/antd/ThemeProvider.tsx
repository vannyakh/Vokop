import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AntdProvider } from './AntdProvider.js';
import {
  cycleUiTheme,
  getUiThemeTokens,
  isDarkUiTheme,
  readStoredUiTheme,
  UI_SYSTEM_CONFIG,
  writeStoredUiTheme,
} from './theme.js';
import type { UiTheme, UiThemeContextValue } from './types.js';

const ThemeContext = createContext<UiThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: ReactNode;
  /** Persist theme under this key (uncontrolled mode). */
  storageKey?: string;
  defaultTheme?: UiTheme;
  /** Controlled theme — when set, storage is not used unless `persistControlled` is true. */
  theme?: UiTheme;
  onThemeChange?: (theme: UiTheme) => void;
  persistControlled?: boolean;
  applyDocumentTheme?: boolean;
}

export function ThemeProvider({
  children,
  storageKey = UI_SYSTEM_CONFIG.storageKey,
  defaultTheme = UI_SYSTEM_CONFIG.defaultTheme,
  theme: controlledTheme,
  onThemeChange,
  persistControlled = false,
  applyDocumentTheme = true,
}: ThemeProviderProps) {
  const isControlled = controlledTheme != null;
  const [uncontrolledTheme, setUncontrolledTheme] = useState<UiTheme>(() =>
    readStoredUiTheme(storageKey, defaultTheme),
  );

  const theme = controlledTheme ?? uncontrolledTheme;

  const setTheme = useCallback(
    (next: UiTheme) => {
      if (!isControlled) {
        setUncontrolledTheme(next);
        writeStoredUiTheme(next, storageKey);
      } else if (persistControlled) {
        writeStoredUiTheme(next, storageKey);
      }
      onThemeChange?.(next);
    },
    [isControlled, onThemeChange, persistControlled, storageKey],
  );

  const toggleTheme = useCallback(() => {
    setTheme(cycleUiTheme(theme));
  }, [setTheme, theme]);

  const value = useMemo<UiThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      tokens: getUiThemeTokens(theme),
      isDark: isDarkUiTheme(theme),
    }),
    [setTheme, theme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <AntdProvider theme={theme} applyDocumentTheme={applyDocumentTheme}>
        {children}
      </AntdProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): UiThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider from @vokop/ui/antd');
  }
  return context;
}
