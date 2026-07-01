import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import {
  STICKER_CATEGORIES,
  fallbackStickersForCategory,
  type StickerCategory,
} from '@/features/studio/constants/stickerCategories';
import {
  hasGiphyKey,
  searchGiphyStickers,
  trendingGiphyStickers,
  type GiphySticker,
} from '@/features/studio/services/giphy';

const STICKERS_PER_ROW = 10;
const STICKER_MAX_PX = 160;

function stickerDisplaySize(width: number, height: number): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: STICKER_MAX_PX, height: STICKER_MAX_PX };
  const scale = STICKER_MAX_PX / Math.max(width, height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function StickerCard({
  sticker,
  onSelect,
}: {
  sticker: GiphySticker;
  onSelect: (sticker: GiphySticker) => void;
}) {
  return (
    <button
      type="button"
      className="sticker-card"
      onClick={() => onSelect(sticker)}
      title={sticker.title}
    >
      <img
        src={sticker.previewUrl}
        alt={sticker.title}
        className="sticker-card-img"
        loading="lazy"
        draggable={false}
      />
    </button>
  );
}

function StickerCarousel({
  stickers,
  onSelect,
}: {
  stickers: GiphySticker[];
  onSelect: (sticker: GiphySticker) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({ left: dir * 120, behavior: 'smooth' });
  };

  if (stickers.length === 0) return null;

  return (
    <div className="sticker-carousel">
      <button
        type="button"
        className="sticker-carousel-nav sticker-carousel-nav--prev"
        onClick={() => scroll(-1)}
        aria-label="Scroll left"
      >
        <ChevronLeft size={14} />
      </button>
      <div ref={scrollerRef} className="sticker-carousel-track">
        {stickers.map((sticker) => (
          <StickerCard key={sticker.id} sticker={sticker} onSelect={onSelect} />
        ))}
      </div>
      <button
        type="button"
        className="sticker-carousel-nav sticker-carousel-nav--next"
        onClick={() => scroll(1)}
        aria-label="Scroll right"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

function StickerCategorySection({
  category,
  onSelect,
}: {
  category: StickerCategory;
  onSelect: (sticker: GiphySticker) => void;
}) {
  const [stickers, setStickers] = useState<GiphySticker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        if (!hasGiphyKey()) {
          if (!cancelled) setStickers(fallbackStickersForCategory(category.id, STICKERS_PER_ROW));
          return;
        }
        const items =
          category.id === 'trending' || !category.query
            ? await trendingGiphyStickers(STICKERS_PER_ROW)
            : await searchGiphyStickers(category.query, STICKERS_PER_ROW);
        if (!cancelled) setStickers(items);
      } catch {
        if (!cancelled) setStickers(fallbackStickersForCategory(category.id, STICKERS_PER_ROW));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [category.id, category.query]);

  return (
    <section className="stickers-section">
      <div className="stickers-section-head">
        <h3 className="stickers-section-title">
          {category.title}
          {category.emoji && <span className="stickers-section-emoji">{category.emoji}</span>}
        </h3>
        {!loading && stickers.length > 0 && (
          <span className="stickers-section-count">{stickers.length}</span>
        )}
      </div>
      {loading ? (
        <div className="stickers-loading">
          <Loader2 size={16} className="animate-spin text-muted" />
        </div>
      ) : (
        <StickerCarousel stickers={stickers} onSelect={onSelect} />
      )}
    </section>
  );
}

export function StickersPanel() {
  const addCanvasImageFromUrl = useAppStore((s) => s.addCanvasImageFromUrl);
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<GiphySticker[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const addSticker = useCallback(
    (sticker: GiphySticker) => {
      const size = stickerDisplaySize(sticker.width, sticker.height);
      addCanvasImageFromUrl(sticker.url, {
        label: sticker.title,
        width: size.width,
        height: size.height,
        keepStudioTool: true,
      });
    },
    [addCanvasImageFromUrl],
  );

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);

    const run = async () => {
      try {
        if (!hasGiphyKey()) {
          const q = query.toLowerCase();
          const matches = fallbackStickersForCategory('search', 20).filter(
            (s) => s.title.toLowerCase().includes(q) || q.length < 2,
          );
          if (!cancelled) setSearchResults(matches.slice(0, 10));
          return;
        }
        const items = await searchGiphyStickers(query, 20);
        if (!cancelled) setSearchResults(items);
      } catch {
        if (!cancelled) setSearchResults(fallbackStickersForCategory('search', 10));
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    };

    const timer = window.setTimeout(() => {
      void run();
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput.trim());
  };

  return (
    <div className="stickers-panel">
      <form className="stickers-search" onSubmit={handleSearchSubmit}>
        <Search size={14} className="stickers-search-icon" aria-hidden />
        <input
          type="search"
          className="stickers-search-input"
          placeholder="Search stickers…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </form>

      {!hasGiphyKey() && (
        <p className="stickers-api-hint">
          Add <code>VITE_GIPHY_API_KEY</code> to your <code>.env</code> for live sticker search.
        </p>
      )}

      {query ? (
        <section className="stickers-section">
          <div className="stickers-section-head">
            <h3 className="stickers-section-title">Results for &ldquo;{query}&rdquo;</h3>
          </div>
          {searchLoading ? (
            <div className="stickers-loading">
              <Loader2 size={16} className="animate-spin text-muted" />
            </div>
          ) : searchResults.length === 0 ? (
            <p className="stickers-empty">No stickers found.</p>
          ) : (
            <div className={cn('stickers-search-grid')}>
              {searchResults.map((sticker) => (
                <StickerCard key={sticker.id} sticker={sticker} onSelect={addSticker} />
              ))}
            </div>
          )}
        </section>
      ) : (
        STICKER_CATEGORIES.map((category) => (
          <StickerCategorySection key={category.id} category={category} onSelect={addSticker} />
        ))
      )}
    </div>
  );
}
