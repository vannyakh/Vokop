import { Sparkles } from 'lucide-react';
import { useTranslation } from '@/features/settings';

interface WhatsNewFabProps {
  onClick: () => void;
}

export function WhatsNewFab({ onClick }: WhatsNewFabProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className="whats-new-fab fixed bottom-6 right-5 sm:right-8 z-40"
      onClick={onClick}
      aria-label={t('whatsNewFabLabel')}
      title={t('whatsNewTitle')}
    >
      <Sparkles size={20} strokeWidth={2} />
    </button>
  );
}
