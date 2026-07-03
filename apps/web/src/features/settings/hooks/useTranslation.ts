import { useTranslation as useI18nextTranslation } from 'react-i18next';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import type { TranslationKey } from '@/i18n';

export function useTranslation() {
  const uiLanguage = useSettingsStore((s) => s.uiLanguage);
  const { i18n, ready } = useI18nextTranslation();

  const t = (key: TranslationKey) => i18n.t(key);

  return { t, uiLanguage, i18n, ready };
}
