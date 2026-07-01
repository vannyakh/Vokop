import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { translations, type TranslationKey } from '@/features/settings/constants/i18n';

export function useTranslation() {
  const uiLanguage = useSettingsStore((s) => s.uiLanguage);
  const t = (key: TranslationKey) => translations[uiLanguage][key] ?? translations.en[key];
  return { t, uiLanguage };
}
