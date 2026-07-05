import { FolderDown } from 'lucide-react';
import { useAppStore } from '@/features/project';

export function TimelineEmptyState() {
  const setActiveStudioTool = useAppStore((s) => s.setActiveStudioTool);
  const setToolsDrawerOpen = useAppStore((s) => s.setToolsDrawerOpen);

  const openMediaPanel = () => {
    setActiveStudioTool('media');
    setToolsDrawerOpen(true);
  };

  return (
    <div className="studio-timeline-empty" aria-live="polite">
      <p className="studio-timeline-empty-title">Your timeline is empty</p>
      <p className="studio-timeline-empty-desc">
        Drag media from the{' '}
        <button type="button" className="studio-timeline-empty-media-btn" onClick={openMediaPanel}>
          <FolderDown size={15} aria-hidden />
          <span>Media</span>
        </button>{' '}
        panel onto the timeline — a track will be created for that footage type.
      </p>
    </div>
  );
}
