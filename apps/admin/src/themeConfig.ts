import { theme as antdTheme } from 'antd';
import { Theme } from './types';

// Global brand tokens & shared preferences variables
export const SYSTEM_CONFIG = {
  brandName: 'System Panel',
  defaultTheme: 'dark' as Theme,
  primaryColor: '#6366f1', // Indigo
  primaryColorDim: '#818cf8', // Indigo dim
  accentColor: '#c9a86a', // Gold
  borderRadius: 12,
  animationSpeed: '0.2s',
  supportedLocales: ['en-US', 'km-KH'],
  defaultCurrency: 'USD',
  timezone: 'Asia/Phnom_Penh'
};

// Design tokens mapped to Tailwind's classes & custom CSS variables
export const THEME_TOKENS: Record<Theme, {
  bg: string;
  panel: string;
  panelSolid: string;
  border: string;
  text: string;
  textDim: string;
  textMid: string;
  antdBgContainer: string;
  antdBorder: string;
}> = {
  light: {
    bg: '#e8e8ee',
    panel: 'rgba(255, 255, 255, 0.6)',
    panelSolid: '#ffffff',
    border: 'rgba(180, 180, 200, 0.4)',
    text: '#16161f',
    textDim: '#9a9aab',
    textMid: '#5c5c70',
    antdBgContainer: '#ffffff',
    antdBorder: 'rgba(0, 0, 0, 0.08)'
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
    antdBorder: 'rgba(255, 255, 255, 0.08)'
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
    antdBorder: 'rgba(255, 255, 255, 0.08)'
  }
};

/**
 * Returns the fully compiled Ant Design Theme ConfigProvider configuration
 * depending on the active theme ('light' | 'dark' | 'dim').
 */
export const getAntdThemeConfig = (currentTheme: Theme) => {
  const isDark = currentTheme === 'dark' || currentTheme === 'dim';
  const tokens = THEME_TOKENS[currentTheme];

  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: currentTheme === 'light' ? SYSTEM_CONFIG.primaryColor : SYSTEM_CONFIG.primaryColorDim,
      borderRadius: SYSTEM_CONFIG.borderRadius,
      colorBgContainer: tokens.antdBgContainer,
      colorBgElevated: currentTheme === 'light' ? '#ffffff' : (currentTheme === 'dim' ? '#12202e' : '#0d0d14'),
      colorBorder: tokens.antdBorder,
      colorText: tokens.text,
      colorTextDescription: tokens.textDim,
      fontFamily: '"Inter", "Geist Variable", -apple-system, BlinkMacSystemFont, sans-serif'
    },
    components: {
      Table: {
        colorBgContainer: 'transparent',
        colorBorderSecondary: tokens.border,
        headerBg: 'transparent',
        headerColor: tokens.text
      },
      Segmented: {
        colorBgContainer: 'rgba(255, 255, 255, 0.02)',
        colorBorder: 'rgba(255, 255, 255, 0.05)'
      },
      Select: {
        selectorBg: 'transparent',
        optionSelectedBg: currentTheme === 'light' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.2)',
        optionActiveBg: currentTheme === 'light' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.04)',
      }
    }
  };
};
