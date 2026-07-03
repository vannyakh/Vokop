import { ConfigProvider } from 'antd';
import { useEffect, type ReactNode } from 'react';
import type { UiTheme } from './types.js';
import { applyUiThemeToDocument, getAntdThemeConfig } from './theme.js';

export function AntdProvider({
  theme,
  children,
  applyDocumentTheme = true,
}: {
  theme: UiTheme;
  children: ReactNode;
  /** Sync `data-theme`, `.dark`, and `--ui-*` CSS variables on `<html>`. */
  applyDocumentTheme?: boolean;
}) {
  useEffect(() => {
    if (!applyDocumentTheme) return;
    applyUiThemeToDocument(theme);
  }, [theme, applyDocumentTheme]);

  return <ConfigProvider theme={getAntdThemeConfig(theme)}>{children}</ConfigProvider>;
}
