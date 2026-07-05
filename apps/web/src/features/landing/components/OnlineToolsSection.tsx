import { useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@/features/settings';
import { cn } from '@/lib/cn';
import {
  TOOLS_CATALOG,
  type ToolCatalogItem,
  type ToolBadge,
} from '@/features/upload/data/toolsCatalog';

interface OnlineToolsSectionProps {
  onSelectTool: (toolId: string) => void;
}

const BADGE_LABELS: Record<ToolBadge, 'toolsBadgeFree' | 'toolsBadgeNew' | 'toolsBadgeHot'> = {
  free: 'toolsBadgeFree',
  new: 'toolsBadgeNew',
  hot: 'toolsBadgeHot',
};

function LandingToolCard({
  tool,
  onSelect,
}: {
  tool: ToolCatalogItem;
  onSelect: (toolId: string) => void;
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
      onClick={() => onSelect(tool.id)}
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

export function OnlineToolsSection({ onSelectTool }: OnlineToolsSectionProps) {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<'all' | 'trending' | 'video' | 'audio'>('all');

  // Flatten tools and filter out duplicates (since some tools like TTS and voice changer appear in multiple categories)
  const allToolsMap = new Map<string, ToolCatalogItem>();
  TOOLS_CATALOG.forEach((cat) => {
    cat.tools.forEach((tool) => {
      allToolsMap.set(tool.id, tool);
    });
  });
  const uniqueTools = Array.from(allToolsMap.values());

  const filteredTools = uniqueTools.filter((tool) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'trending') {
      const trendingCategory = TOOLS_CATALOG.find((c) => c.id === 'trending');
      return trendingCategory?.tools.some((t) => t.id === tool.id) ?? false;
    }
    if (activeFilter === 'video') {
      return !tool.id.startsWith('audio-') && tool.id !== 'text-to-speech' && tool.id !== 'voice-changer';
    }
    if (activeFilter === 'audio') {
      return tool.id.startsWith('audio-') || tool.id === 'text-to-speech' || tool.id === 'voice-changer';
    }
    return true;
  });

  const FILTERS = [
    { id: 'all', labelKey: 'toolsFilterAll' },
    { id: 'trending', labelKey: 'toolsFilterTrending' },
    { id: 'video', labelKey: 'toolsFilterVideo' },
    { id: 'audio', labelKey: 'toolsFilterAudio' },
  ] as const;

  return (
    <section className="landing-section landing-tools-section" id="online-tools">
      <div className="landing-section-head-row">
        <div>
          <span className="landing-section-eyebrow flex items-center gap-1.5">
            <Sparkles size={12} className="text-accent" />
            {t('toolsSectionEyebrow')}
          </span>
          <h2 className="landing-section-title font-display">{t('toolsSectionTitle')}</h2>
          <p className="landing-section-desc max-w-2xl">
            {t('toolsSectionSubtitle')}
          </p>
        </div>
      </div>

      <div className="studio-template-filters" role="tablist" aria-label="Tools categories">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={activeFilter === filter.id}
            className={cn(
              'studio-template-filter',
              activeFilter === filter.id && 'is-active'
            )}
            onClick={() => setActiveFilter(filter.id)}
          >
            {t(filter.labelKey)}
          </button>
        ))}
      </div>

      <div className="tools-catalog-grid mt-8">
        {filteredTools.map((tool) => (
          <LandingToolCard
            key={tool.id}
            tool={tool}
            onSelect={onSelectTool}
          />
        ))}
      </div>
    </section>
  );
}
