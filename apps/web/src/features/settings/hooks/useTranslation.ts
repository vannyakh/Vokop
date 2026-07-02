import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { translate, type TranslationKey } from '@vokop/shared';

export function useTranslation() {
  const uiLanguage = useSettingsStore((s) => s.uiLanguage);
  const t = (key: TranslationKey) => translate(uiLanguage, key);
  return { t, uiLanguage };
}
