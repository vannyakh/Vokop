export {
  DEFAULT_LOCALE,
  I18N_LOCALES,
  UI_LANGUAGES,
  isUiLanguage,
  type UiLanguage,
} from './config.js';
export { createI18n, type AppMessages, type LocaleMessages, type TranslationKeyOf } from './createI18n.js';
export {
  toI18nextResources,
  type I18nextResourceBundle,
  type I18nextResources,
} from './toI18nextResources.js';
