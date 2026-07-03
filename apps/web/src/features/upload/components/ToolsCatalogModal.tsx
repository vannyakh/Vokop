import { useRef } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from '@/features/settings';
import {
  TOOLS_CATALOG,
  toolsCatalogGridClass,
  type ToolBadge,
  type ToolCatalogItem,
} from '@/features/upload/data/toolsCatalog';

interface ToolsCatalogModalProps {
  open: boolean;
  onClose: () => void;
  onSelectTool?: (toolId: string) => void;
}

const BADGE_LABELS: Record<ToolBadge, 'toolsBadgeFree' | 'toolsBadgeNew' | 'toolsBadgeHot'> = {
  free: 'toolsBadgeFree',
  new: 'toolsBadgeNew',
  hot: 'toolsBadgeHot',
};

function ToolCard({
  tool,
  onSelect,
}: {
  tool: ToolCatalogItem;
  onSelect?: (toolId: string) => void;
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const Icon = tool.icon;
  const primaryBadge = tool.badges.find((badge) => badge !== 'new') ?? tool.badges[0];
  const showNewBadge = tool.badges.includes('new');

  const handleMouseEnter = () => {
    const video = videoRef.current;
    if (!video) return;
    video.style.opacity = '1';
    void video.play().catch(() => undefined);
  };

  const handleMouseLeave = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    video.style.opacity = '0';
  };

  return (
    <button
      type="button"
      className="tools-catalog-card"
      onClick={() => onSelect?.(tool.id)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="tools-catalog-card-cover">
        <div className="tools-catalog-card-tags">
          {primaryBadge ? (
            <span className={`tools-catalog-badge tools-catalog-badge--${primaryBadge}`}>
              {t(BADGE_LABELS[primaryBadge])}
            </span>
          ) : null}
          {showNewBadge ? (
            <span className="tools-catalog-badge tools-catalog-badge--new">
              {t(BADGE_LABELS.new)}
            </span>
          ) : null}
        </div>

        <img
          className="tools-catalog-card-cover-img"
          src={tool.media.cover}
          alt=""
          draggable={false}
          loading="lazy"
        />

        {tool.media.video ? (
          <video
            ref={videoRef}
            className="tools-catalog-card-cover-video"
            src={tool.media.video}
            muted
            playsInline
            preload="metadata"
            loop
          />
        ) : null}
      </div>

      <div className="tools-catalog-card-icon-wrap" aria-hidden="true">
        <span className="tools-catalog-card-icon">
          <Icon size={18} strokeWidth={2} />
        </span>
      </div>

      <div className="tools-catalog-card-text">
        <h4 className="tools-catalog-card-title">{t(tool.titleKey)}</h4>
        <p className="tools-catalog-card-body">{t(tool.bodyKey)}</p>
      </div>
    </button>
  );
}

export function ToolsCatalogModal({ open, onClose, onSelectTool }: ToolsCatalogModalProps) {
  const { t } = useTranslation();

  const handleSelect = (toolId: string) => {
    onSelectTool?.(toolId);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="tools-catalog-overlay fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="tools-catalog-backdrop absolute inset-0"
            aria-label="Close"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="tools-catalog-panel relative flex w-full max-w-[980px] max-h-[min(90vh,860px)] flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tools-catalog-title"
          >
            <div className="tools-catalog-header">
              <h2 id="tools-catalog-title" className="tools-catalog-title">
                {t('toolsModalTitle')}
              </h2>
              <button type="button" onClick={onClose} className="tools-catalog-close" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="tools-catalog-body">
              {TOOLS_CATALOG.map((category) => (
                <section key={category.id} className="tools-catalog-section">
                  <div className="tools-catalog-section-head">
                    <h3 className="tools-catalog-section-title">{t(category.labelKey)}</h3>
                    <span className="tools-catalog-section-count">{category.tools.length}</span>
                  </div>
                  <div className={toolsCatalogGridClass(category.tools.length)}>
                    {category.tools.map((tool) => (
                      <ToolCard key={`${category.id}-${tool.id}`} tool={tool} onSelect={handleSelect} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
