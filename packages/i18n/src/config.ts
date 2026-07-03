export const I18N_LOCALES = ['en', 'km', 'es', 'fr'] as const;

export type UiLanguage = (typeof I18N_LOCALES)[number];

export const DEFAULT_LOCALE: UiLanguage = 'en';

export const UI_LANGUAGES: { code: UiLanguage; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'km', label: 'Khmer', native: 'ភាសាខ្មែរ' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'fr', label: 'French', native: 'Français' },
];

export function isUiLanguage(value: string): value is UiLanguage {
  return (I18N_LOCALES as readonly string[]).includes(value);
}
