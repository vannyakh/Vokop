export type UiLanguage = 'en' | 'km' | 'es' | 'fr';
export type ColorTheme = 'light' | 'dark';

export interface UserPreferences {
  uiLanguage: UiLanguage;
  colorTheme: ColorTheme;
}

export interface LanguageOption {
  code: string;
  name: string;
}

export interface VoiceOption {
  id: string;
  label: string;
}
