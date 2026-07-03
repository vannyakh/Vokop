import { ConfigProvider } from 'antd';
import type { ReactNode } from 'react';
import type { UiTheme } from './types.js';
import { getAntdThemeConfig } from './theme.js';

export function AntdProvider({
  theme,
  children,
}: {
  theme: UiTheme;
  children: ReactNode;
}) {
  return <ConfigProvider theme={getAntdThemeConfig(theme)}>{children}</ConfigProvider>;
}
