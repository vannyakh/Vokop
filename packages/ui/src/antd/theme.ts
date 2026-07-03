import { theme as antdTheme, type ThemeConfig } from 'antd';
import type { UiTheme, UiThemeTokens } from './types.js';

/** Global brand tokens & shared preferences (template-aligned). */
export const UI_SYSTEM_CONFIG = {
  brandName: 'Vokop',
  defaultTheme: 'dark' as UiTheme,
  primaryColor: '#6366f1',
  primaryColorDim: '#818cf8',
  accentColor: '#c9a86a',
  borderRadius: 12,
  animationSpeed: '0.2s',
  supportedLocales: ['en-US', 'km-KH', 'es-ES', 'fr-FR'],
  defaultCurrency: 'USD',
  timezone: 'Asia/Phnom_Penh',
  storageKey: 'vokop-ui-theme',
} as const;

/** Design tokens mapped to CSS variables & Ant Design. */
export const UI_THEME_TOKENS: Record<UiTheme, UiThemeTokens> = {
  light: {
    bg: '#e8e8ee',
    panel: 'rgba(255, 255, 255, 0.6)',
    panelSolid: '#ffffff',
    border: 'rgba(180, 180, 200, 0.4)',
    text: '#16161f',
    textDim: '#9a9aab',
    textMid: '#5c5c70',
    antdBgContainer: '#ffffff',
    antdBorder: 'rgba(0, 0, 0, 0.08)',
    antdBgElevated: '#ffffff',
  },
  dark: {
    bg: '#0a0a0f',
    panel: '#0f0f17',
    panelSolid: '#0f0f17',
    border: 'rgba(255, 255, 255, 0.08)',
    text: '#e4e4ec',
    textDim: '#6b6b80',
    textMid: '#9090a8',
    antdBgContainer: '#12121a',
    antdBorder: 'rgba(255, 255, 255, 0.08)',
    antdBgElevated: '#0d0d14',
  },
  dim: {
    bg: '#152433',
    panel: 'rgba(18, 32, 46, 0.85)',
    panelSolid: '#12202e',
    border: 'rgba(100, 140, 180, 0.18)',
    text: '#d5dbe2',
    textDim: '#6b7fa0',
    textMid: '#8a9dc0',
    antdBgContainer: '#172738',
    antdBorder: 'rgba(255, 255, 255, 0.08)',
    antdBgElevated: '#12202e',
  },
};

/** Template-compatible aliases. */
export const SYSTEM_CONFIG = UI_SYSTEM_CONFIG;
export const THEME_TOKENS = UI_THEME_TOKENS;

export function isUiTheme(value: string | null | undefined): value is UiTheme {
  return value === 'light' || value === 'dark' || value === 'dim';
}

export function isDarkUiTheme(theme: UiTheme): boolean {
  return theme === 'dark' || theme === 'dim';
}

export function getUiThemeTokens(theme: UiTheme): UiThemeTokens {
  return UI_THEME_TOKENS[theme] ?? UI_THEME_TOKENS[UI_SYSTEM_CONFIG.defaultTheme];
}

export function cycleUiTheme(theme: UiTheme): UiTheme {
  if (theme === 'light') return 'dark';
  if (theme === 'dark') return 'dim';
  return 'light';
}

export function readStoredUiTheme(
  storageKey: string = UI_SYSTEM_CONFIG.storageKey,
  fallback: UiTheme = UI_SYSTEM_CONFIG.defaultTheme,
): UiTheme {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = window.localStorage.getItem(storageKey);
    return isUiTheme(saved) ? saved : fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredUiTheme(
  theme: UiTheme,
  storageKey: string = UI_SYSTEM_CONFIG.storageKey,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, theme);
  } catch {
    // ignore quota / private mode
  }
}

/** Apply shared theme to `<html>` for CSS variables + dark class. */
export function applyUiThemeToDocument(theme: UiTheme): void {
  if (typeof document === 'undefined') return;

  const tokens = getUiThemeTokens(theme);
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', isDarkUiTheme(theme));

  root.style.setProperty('--ui-bg', tokens.bg);
  root.style.setProperty('--ui-panel', tokens.panel);
  root.style.setProperty('--ui-panel-solid', tokens.panelSolid);
  root.style.setProperty('--ui-border', tokens.border);
  root.style.setProperty('--ui-text', tokens.text);
  root.style.setProperty('--ui-text-dim', tokens.textDim);
  root.style.setProperty('--ui-text-mid', tokens.textMid);
  root.style.setProperty('--ui-primary', UI_SYSTEM_CONFIG.primaryColor);
  root.style.setProperty('--ui-primary-dim', UI_SYSTEM_CONFIG.primaryColorDim);
  root.style.setProperty('--ui-accent', UI_SYSTEM_CONFIG.accentColor);
  root.style.setProperty('--ui-radius', `${UI_SYSTEM_CONFIG.borderRadius}px`);
  root.style.setProperty('--ui-animation', UI_SYSTEM_CONFIG.animationSpeed);
}

/**
 * Fully compiled Ant Design `ConfigProvider` theme for the active UI theme.
 */
export function getAntdThemeConfig(currentTheme: UiTheme): ThemeConfig {
  const isDark = isDarkUiTheme(currentTheme);
  const tokens = getUiThemeTokens(currentTheme);

  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary:
        currentTheme === 'light' ? UI_SYSTEM_CONFIG.primaryColor : UI_SYSTEM_CONFIG.primaryColorDim,
      colorLink:
        currentTheme === 'light' ? UI_SYSTEM_CONFIG.primaryColor : UI_SYSTEM_CONFIG.primaryColorDim,
      borderRadius: UI_SYSTEM_CONFIG.borderRadius,
      colorBgContainer: tokens.antdBgContainer,
      colorBgElevated: tokens.antdBgElevated,
      colorBorder: tokens.antdBorder,
      colorText: tokens.text,
      colorTextDescription: tokens.textDim,
      colorTextSecondary: tokens.textMid,
      fontFamily: '"Inter", "Geist Variable", -apple-system, BlinkMacSystemFont, sans-serif',
      motionDurationMid: UI_SYSTEM_CONFIG.animationSpeed,
    },
    components: {
      Popover: {
        colorBgElevated: tokens.antdBgElevated,
        colorText: tokens.text,
        borderRadiusLG: UI_SYSTEM_CONFIG.borderRadius + 4,
      },
      Modal: {
        contentBg: tokens.panelSolid,
        headerBg: tokens.panelSolid,
        titleColor: tokens.text,
      },
      Table: {
        colorBgContainer: 'transparent',
        colorBorderSecondary: tokens.border,
        headerBg: 'transparent',
        headerColor: tokens.text,
      },
      Segmented: {
        colorBgContainer: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.03)',
        colorBorder: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)',
      },
      Select: {
        selectorBg: 'transparent',
        optionSelectedBg:
          currentTheme === 'light' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.2)',
        optionActiveBg:
          currentTheme === 'light' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.04)',
      },
      Tooltip: {
        colorBgSpotlight: tokens.antdBgElevated,
        colorTextLightSolid: tokens.text,
      },
    },
  };
}
