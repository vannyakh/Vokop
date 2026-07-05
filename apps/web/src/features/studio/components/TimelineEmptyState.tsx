import { FolderDown } from 'lucide-react';
import { useAppStore } from '@/features/project';
import { useTranslation } from '@/features/settings';

export function TimelineEmptyState() {
  const { t } = useTranslation();
  const setActiveStudioTool = useAppStore((s) => s.setActiveStudioTool);
  const setToolsDrawerOpen = useAppStore((s) => s.setToolsDrawerOpen);

  const openMediaPanel = () => {
    setActiveStudioTool('media');
    setToolsDrawerOpen(true);
  };

  return (
    <div className="studio-timeline-empty" aria-live="polite">
      <p className="studio-timeline-empty-title">{t('emptyTimelineTitle')}</p>
      <p className="studio-timeline-empty-desc">
        {t('emptyTimelineDescPrefix')}
        <button type="button" className="studio-timeline-empty-media-btn" onClick={openMediaPanel}>
          <FolderDown size={15} aria-hidden />
          <span>{t('studioToolMedia')}</span>
        </button>
        {t('emptyTimelineDescSuffix')}
      </p>
    </div>
  );
}
