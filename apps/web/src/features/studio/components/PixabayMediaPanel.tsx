import { useState, useRef, useCallback } from 'react';
import { Search, Image as ImageIcon, Film, Download, AlertCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/features/project';
import { StudioPanel } from '@/features/studio/components/StudioPanel';
import {
  searchPixabayImages,
  searchPixabayVideos,
  type PixabayImage,
  type PixabayVideo,
} from '@/features/studio/services/pixabay';
import { useMediaStatus } from '@/features/studio/hooks/useMediaStatus';

type MediaTab = 'images' | 'videos';

function getVideoPoster(video: PixabayVideo): string {
  return `https://i.vimeocdn.com/video/${video.videos.large.picture_id}_295x166.jpg`;
}

function ImageResultCard({
  item,
  onAdd,
}: {
  item: PixabayImage;
  onAdd: (item: PixabayImage) => void;
}) {
  return (
    <button
      type="button"
      className="pixabay-media-card"
      onClick={() => onAdd(item)}
      title={item.tags}
    >
      <img src={item.previewURL} alt={item.tags} loading="lazy" className="pixabay-media-thumb" />
      <div className="pixabay-media-card-overlay">
        <Download size={12} />
        Add
      </div>
    </button>
  );
}

function VideoResultCard({
  item,
  onAdd,
}: {
  item: PixabayVideo;
  onAdd: (item: PixabayVideo) => void;
}) {
  const poster = getVideoPoster(item);
  return (
    <button
      type="button"
      className="pixabay-media-card pixabay-media-card--video"
      onClick={() => onAdd(item)}
      title={item.tags}
    >
      <img src={poster} alt={item.tags} loading="lazy" className="pixabay-media-thumb" />
      <span className="pixabay-media-duration">{item.duration}s</span>
      <div className="pixabay-media-card-overlay">
        <Film size={12} />
        Preview
      </div>
    </button>
  );
}

export function PixabayMediaPanel() {
  const addCanvasImageOverlay = useAppStore((s) => s.addCanvasImageOverlay);
  const [tab, setTab] = useState<MediaTab>('images');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageResults, setImageResults] = useState<PixabayImage[]>([]);
  const [videoResults, setVideoResults] = useState<PixabayVideo[]>([]);
  const [page, setPage] = useState(1);
  const [totalHits, setTotalHits] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: mediaStatus, isPending: statusPending } = useMediaStatus();
  const hasKey = mediaStatus?.pixabay ?? false;

  const PER_PAGE = 18;

  const doSearch = useCallback(async (q: string, p: number, mediaTab: MediaTab) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (mediaTab === 'images') {
        const res = await searchPixabayImages(q, p, PER_PAGE);
        setImageResults(res.hits);
        setTotalHits(res.totalHits);
      } else {
        const res = await searchPixabayVideos(q, p, PER_PAGE);
        setVideoResults(res.hits);
        setTotalHits(res.totalHits);
      }
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void doSearch(query, 1, tab);
  };

  const handleTabChange = (t: MediaTab) => {
    setTab(t);
    setImageResults([]);
    setVideoResults([]);
    setPage(1);
    setTotalHits(0);
    if (query.trim()) void doSearch(query, 1, t);
  };

  const handleAddImage = (item: PixabayImage) => {
    const proxyUrl = item.webformatURL;
    fetch(proxyUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const ext = blob.type.split('/')[1] ?? 'jpg';
        const file = new File([blob], `pixabay-${item.id}.${ext}`, { type: blob.type });
        addCanvasImageOverlay(file);
      })
      .catch(() => {
        setError('Could not fetch image. Try downloading manually.');
      });
  };

  const handleAddVideo = (item: PixabayVideo) => {
    const videoUrl = item.videos.medium?.url || item.videos.small?.url;
    if (videoUrl) {
      window.open(videoUrl, '_blank');
    }
  };

  const totalPages = Math.ceil(totalHits / PER_PAGE);
  const results = tab === 'images' ? imageResults : videoResults;
  const hasResults = results.length > 0;

  return (
    <StudioPanel
      title="Stock media"
      icon={<ImageIcon size={12} className="text-accent" />}
    >
      {statusPending ? (
        <div className="pixabay-no-key">
          <Loader2 size={18} className="animate-spin text-muted" />
          <p className="text-xs text-muted leading-relaxed mt-2">Checking media service…</p>
        </div>
      ) : !hasKey ? (
        <div className="pixabay-no-key">
          <AlertCircle size={18} className="pixabay-no-key-icon" />
          <p className="text-xs text-muted leading-relaxed">
            Add your Pixabay API key to enable stock media search.
          </p>
          <p className="text-xs text-faint leading-relaxed mt-1">
            Set <code className="text-accent">PIXABAY_API_KEY</code> in your server <code>.env</code> file.
          </p>
          <a
            href="https://pixabay.com/api/docs/"
            target="_blank"
            rel="noreferrer"
            className="pixabay-docs-link"
          >
            Get a free API key →
          </a>
        </div>
      ) : (
        <>
          <div className="pixabay-tabs">
            <button
              type="button"
              className={cn('pixabay-tab', tab === 'images' && 'active')}
              onClick={() => handleTabChange('images')}
            >
              <ImageIcon size={12} />
              Images
            </button>
            <button
              type="button"
              className={cn('pixabay-tab', tab === 'videos' && 'active')}
              onClick={() => handleTabChange('videos')}
            >
              <Film size={12} />
              Videos
            </button>
          </div>

          <form onSubmit={handleSearch} className="pixabay-search-form">
            <div className="pixabay-search-wrap">
              <Search size={13} className="pixabay-search-icon" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Pixabay…"
                className="pixabay-search-input"
              />
            </div>
            <button type="submit" className="pixabay-search-btn" disabled={loading || !query.trim()}>
              {loading ? <Loader2 size={13} className="animate-spin" /> : 'Go'}
            </button>
          </form>

          {error && (
            <div className="pixabay-error">
              <AlertCircle size={12} />
              {error}
            </div>
          )}

          {hasResults && (
            <div className="pixabay-results-grid">
              {tab === 'images'
                ? imageResults.map((item) => (
                    <ImageResultCard key={item.id} item={item} onAdd={handleAddImage} />
                  ))
                : videoResults.map((item) => (
                    <VideoResultCard key={item.id} item={item} onAdd={handleAddVideo} />
                  ))}
            </div>
          )}

          {hasResults && totalPages > 1 && (
            <div className="pixabay-pagination">
              <button
                type="button"
                className="pixabay-page-btn"
                disabled={page <= 1 || loading}
                onClick={() => void doSearch(query, page - 1, tab)}
              >
                <ChevronLeft size={13} />
              </button>
              <span className="pixabay-page-label">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                className="pixabay-page-btn"
                disabled={page >= totalPages || loading}
                onClick={() => void doSearch(query, page + 1, tab)}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}

          {!hasResults && !loading && query && !error && (
            <p className="text-xs text-muted text-center py-3">No results for "{query}"</p>
          )}

          {!hasResults && !loading && !query && (
            <p className="text-xs text-faint text-center py-3 leading-relaxed">
              Search for free photos and videos from Pixabay.
            </p>
          )}
        </>
      )}
    </StudioPanel>
  );
}
