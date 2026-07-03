/** Shared UI themes used by Ant Design + document tokens. */
export type UiTheme = 'dark' | 'light' | 'dim';

export type UiThemeTokens = {
  bg: string;
  panel: string;
  panelSolid: string;
  border: string;
  text: string;
  textDim: string;
  textMid: string;
  antdBgContainer: string;
  antdBorder: string;
  antdBgElevated: string;
};

export type UiThemeContextValue = {
  theme: UiTheme;
  setTheme: (theme: UiTheme) => void;
  toggleTheme: () => void;
  tokens: UiThemeTokens;
  isDark: boolean;
};
