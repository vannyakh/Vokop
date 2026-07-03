import { DEFAULT_LOCALE, type UiLanguage } from './config.js';

export type LocaleMessages = Record<string, string>;
export type AppMessages = Record<UiLanguage, LocaleMessages>;

export function createI18n<const T extends AppMessages>(messages: T) {
  type TranslationKey = Extract<keyof T[typeof DEFAULT_LOCALE], string>;
  const fallback = messages[DEFAULT_LOCALE];

  function translate(locale: UiLanguage, key: TranslationKey): string {
    const table = messages[locale] ?? fallback;
    return table[key] ?? fallback[key] ?? key;
  }

  return { translate, messages };
}

export type TranslationKeyOf<T extends AppMessages> = Extract<keyof T[typeof DEFAULT_LOCALE], string>;
