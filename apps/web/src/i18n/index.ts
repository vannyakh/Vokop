import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, toI18nextResources } from '@vokop/i18n';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import km from '../locales/km.json';

export const webMessages = { en, km, es, fr } as const;

const resources = toI18nextResources(webMessages);

void i18n.use(initReactI18next).init({
  resources,
  lng: useSettingsStore.getState().uiLanguage,
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

useSettingsStore.subscribe((state, prev) => {
  if (state.uiLanguage !== prev.uiLanguage && i18n.language !== state.uiLanguage) {
    void i18n.changeLanguage(state.uiLanguage);
  }
});

export default i18n;
export type TranslationKey = Extract<keyof typeof en, string>;
