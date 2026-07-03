import { useState } from 'react';
import { AudioLines, Clapperboard } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/features/settings';
import { ToolsCatalogModal } from '@/features/upload/components/ToolsCatalogModal';
import vokopIcon from '@/assets/images/vokop.png';

export type UploadHeroMode = 'video' | 'audio';

interface UploadHeroTabsProps {
  value: UploadHeroMode;
  onChange: (mode: UploadHeroMode) => void;
  onToolSelect?: (toolId: string) => void;
}

const MODES: UploadHeroMode[] = ['video', 'audio'];

const MODE_ICONS = {
  video: Clapperboard,
  audio: AudioLines,
} as const;

export function UploadHeroTabs({ value, onChange, onToolSelect }: UploadHeroTabsProps) {
  const { t } = useTranslation();
  const [toolsOpen, setToolsOpen] = useState(false);

  const labels: Record<UploadHeroMode, string> = {
    video: t('heroTabVideo'),
    audio: t('heroTabAudio'),
  };

  return (
    <>
      <div className="upload-hero-tabs-wrap">
        <div className="upload-hero-tabs" role="tablist" aria-label={t('heroTabsLabel')}>
          {MODES.map((mode) => {
            const active = value === mode;
            const Icon = MODE_ICONS[mode];

            return (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChange(mode)}
                className={cn('upload-hero-tab', active && 'upload-hero-tab--active')}
              >
                {active ? (
                  <motion.span
                    layoutId="upload-hero-tab-indicator"
                    className="upload-hero-tab-indicator"
                    transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                  />
                ) : null}
                <span className="upload-hero-tab-content">
                  <span className="upload-hero-tab-icon" aria-hidden="true">
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  <span>{labels[mode]}</span>
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="upload-hero-tabs-mark"
          onClick={() => setToolsOpen(true)}
          aria-label={t('toolsCatalogButtonLabel')}
          title={t('toolsModalTitle')}
        >
          <img src={vokopIcon} alt="" className="upload-hero-tabs-mark-img" draggable={false} />
        </button>
      </div>

      <ToolsCatalogModal
        open={toolsOpen}
        onClose={() => setToolsOpen(false)}
        onSelectTool={onToolSelect}
      />
    </>
  );
}
