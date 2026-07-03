import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, toI18nextResources } from '@vokop/i18n';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import km from '../locales/km.json';

export const adminMessages = { en, km, es, fr } as const;

const resources = toI18nextResources(adminMessages);

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
export type TranslationKey = Extract<keyof typeof en, string>;
