import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  EFFECT_CATALOG_CATEGORIES,
  EFFECT_QUICK_TAGS,
  getEffectCatalogItems,
  getEffectPreview,
  searchEffectCatalog,
  type EffectCatalogItem,
} from '@/assets/support';
import { StickersPanel } from '@/features/studio/components/StickersPanel';

type EffectsTab = 'video' | 'stickers';

interface EffectsPanelProps {
  activeId?: string | null;
  disabled?: boolean;
  onSelect: (presetId: string) => void;
}

function EffectCard({
  item,
  active,
  disabled,
  onSelect,
}: {
  item: EffectCatalogItem;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const preview = getEffectPreview(item);
  const mediaStyle: CSSProperties = {
    filter: preview.filter,
    transform: preview.transform,
  };

  return (
    <button
      type="button"
      className={cn('effects-card', active && 'is-active')}
      disabled={disabled}
      title={item.label}
      onClick={onSelect}
    >
      <span className="effects-card-thumb">
        <img
          src={preview.src}
          alt=""
          className="effects-card-media"
          style={mediaStyle}
          loading="lazy"
          draggable={false}
        />
        {preview.overlay && (
          <span
            className="effects-card-overlay"
            style={{ backgroundImage: preview.overlay }}
            aria-hidden
          />
        )}
        {item.pro && <span className="effects-card-pro" aria-label="Pro" />}
        {active && <span className="effects-card-check" aria-hidden>✓</span>}
      </span>
      <span className="effects-card-label">{item.label}</span>
    </button>
  );
}

function EffectCarousel({
  title,
  items,
  activeApplyId,
  disabled,
  onSelect,
  onViewAll,
}: {
  title: string;
  items: EffectCatalogItem[];
  activeApplyId?: string | null;
  disabled?: boolean;
  onSelect: (item: EffectCatalogItem) => void;
  onViewAll: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const updateNav = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateNav();
  }, [items.length]);

  const scroll = (dir: -1 | 1) => {
    trackRef.current?.scrollBy({ left: dir * 160, behavior: 'smooth' });
    window.setTimeout(updateNav, 220);
  };

  if (!items.length) return null;

  return (
    <section className="effects-section">
      <div className="effects-section-head">
        <h3 className="effects-section-title">{title}</h3>
        <button type="button" className="effects-section-view-all" onClick={onViewAll}>
          View all
        </button>
      </div>

      <div className="effects-carousel">
        <button
          type="button"
          className={cn(
            'effects-carousel-nav effects-carousel-nav--prev',
            !canLeft && 'is-disabled',
          )}
          disabled={!canLeft}
          onClick={() => scroll(-1)}
          aria-label={`Scroll ${title} left`}
        >
          <ChevronLeft size={16} />
        </button>

        <div
          ref={trackRef}
          className="effects-carousel-track"
          onScroll={updateNav}
        >
          {items.map((item) => (
            <EffectCard
              key={item.id}
              item={item}
              active={activeApplyId === item.applyId}
              disabled={disabled}
              onSelect={() => onSelect(item)}
            />
          ))}
          <button
            type="button"
            className="effects-view-all-tile"
            onClick={onViewAll}
          >
            <ArrowRight size={18} />
            <span>View all</span>
          </button>
        </div>

        <button
          type="button"
          className={cn(
            'effects-carousel-nav effects-carousel-nav--next',
            !canRight && 'is-disabled',
          )}
          disabled={!canRight}
          onClick={() => scroll(1)}
          aria-label={`Scroll ${title} right`}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}

export function EffectsPanel({
  activeId,
  disabled,
  onSelect,
}: EffectsPanelProps) {
  const [tab, setTab] = useState<EffectsTab>('video');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string>('all');
  const [selectedApplyId, setSelectedApplyId] = useState<string | null>(
    activeId ?? 'none',
  );
  const [viewAllCategory, setViewAllCategory] = useState<string | null>(null);

  const currentActive = activeId ?? selectedApplyId;

  const handleSelect = (item: EffectCatalogItem) => {
    setSelectedApplyId(item.applyId);
    onSelect(item.applyId);
  };

  const filteredItems = useMemo(() => {
    const searched = searchEffectCatalog(query);
    if (viewAllCategory) {
      return searched.filter((item) => item.categoryId === viewAllCategory);
    }
    if (tag === 'all') return searched;
    return searched.filter((item) => item.categoryId === tag);
  }, [query, tag, viewAllCategory]);

  const categories = useMemo(() => {
    if (query.trim() || viewAllCategory || tag !== 'all') return [];
    return EFFECT_CATALOG_CATEGORIES.map((cat) => ({
      ...cat,
      items: getEffectCatalogItems(cat.id),
    })).filter((cat) => cat.items.length > 0);
  }, [query, tag, viewAllCategory]);

  const showGrid = Boolean(query.trim() || viewAllCategory || tag !== 'all');

  return (
    <div className="effects-panel">
      <div className="effects-tabs" role="tablist" aria-label="Effects">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'video'}
          className={cn('effects-tab', tab === 'video' && 'is-active')}
          onClick={() => setTab('video')}
        >
          Video effects
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'stickers'}
          className={cn('effects-tab', tab === 'stickers' && 'is-active')}
          onClick={() => setTab('stickers')}
        >
          Stickers
        </button>
      </div>

      {tab === 'video' ? (
        <div className="effects-video">
          <form className="effects-search" onSubmit={(e) => e.preventDefault()}>
            <Search size={14} className="effects-search-icon" aria-hidden />
            <input
              type="search"
              className="effects-search-input"
              placeholder="Search effects"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setViewAllCategory(null);
              }}
            />
          </form>

          <div className="effects-tags" role="tablist" aria-label="Effect categories">
            {EFFECT_QUICK_TAGS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tag === item.id && !viewAllCategory}
                className={cn(
                  'effects-tag',
                  tag === item.id && !viewAllCategory && 'is-active',
                )}
                onClick={() => {
                  setTag(item.id);
                  setViewAllCategory(null);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {viewAllCategory && (
            <div className="effects-view-all-bar">
              <button
                type="button"
                className="effects-view-all-back"
                onClick={() => setViewAllCategory(null)}
              >
                <ChevronLeft size={14} />
                Back
              </button>
              <span className="effects-view-all-title">
                {EFFECT_CATALOG_CATEGORIES.find((c) => c.id === viewAllCategory)?.label ??
                  'Effects'}
              </span>
            </div>
          )}

          {showGrid ? (
            filteredItems.length === 0 ? (
              <p className="effects-empty">No effects match your search.</p>
            ) : (
              <div className="effects-search-grid">
                {filteredItems.map((item) => (
                  <EffectCard
                    key={item.id}
                    item={item}
                    active={currentActive === item.applyId}
                    disabled={disabled}
                    onSelect={() => handleSelect(item)}
                  />
                ))}
              </div>
            )
          ) : (
            categories.map((cat) => (
              <EffectCarousel
                key={cat.id}
                title={cat.label}
                items={cat.items}
                activeApplyId={currentActive}
                disabled={disabled}
                onSelect={handleSelect}
                onViewAll={() => {
                  setViewAllCategory(cat.id);
                  setTag(cat.id);
                }}
              />
            ))
          )}
        </div>
      ) : (
        <div className="effects-stickers">
          <StickersPanel />
        </div>
      )}
    </div>
  );
}
