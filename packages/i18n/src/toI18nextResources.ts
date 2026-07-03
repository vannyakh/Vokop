import type { AppMessages } from './createI18n.js';

export type I18nextResourceBundle = { translation: Record<string, string> };
export type I18nextResources = Record<string, I18nextResourceBundle>;

export function toI18nextResources(messages: AppMessages): I18nextResources {
  return Object.fromEntries(
    Object.entries(messages).map(([language, translation]) => [
      language,
      { translation },
    ]),
  );
}
