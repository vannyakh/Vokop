import type { ReactNode } from 'react';
import {
  ThemeProvider as SharedThemeProvider,
  useTheme,
  type UiTheme,
} from '@vokop/ui/antd';

/** Admin theme shell — shared tokens + Ant Design config from `@vokop/ui/antd`. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <SharedThemeProvider storageKey="vokop-admin-theme" defaultTheme="dark">
      {children}
    </SharedThemeProvider>
  );
}

export { useTheme };
export type { UiTheme as Theme };
