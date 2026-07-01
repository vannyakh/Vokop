const PIXABAY_KEY = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_PIXABAY_API_KEY ?? '';

export interface PixabayImage {
  id: number;
  previewURL: string;
  webformatURL: string;
  largeImageURL: string;
  tags: string;
  imageWidth: number;
  imageHeight: number;
  type: string;
  user: string;
  views: number;
  downloads: number;
  likes: number;
}

export interface PixabayVideo {
  id: number;
  tags: string;
  duration: number;
  user: string;
  views: number;
  downloads: number;
  likes: number;
  videos: {
    large: { url: string; width: number; height: number; picture_id: string };
    medium: { url: string; width: number; height: number };
    small: { url: string; width: number; height: number };
    tiny: { url: string; width: number; height: number };
  };
}

export interface PixabaySearchResult<T> {
  total: number;
  totalHits: number;
  hits: T[];
}

export function hasPixabayKey(): boolean {
  return PIXABAY_KEY.length > 0;
}

export async function searchPixabayImages(
  query: string,
  page = 1,
  perPage = 20,
): Promise<PixabaySearchResult<PixabayImage>> {
  if (!PIXABAY_KEY) throw new Error('PIXABAY_API_KEY not configured');
  const url = new URL('https://pixabay.com/api/');
  url.searchParams.set('key', PIXABAY_KEY);
  url.searchParams.set('q', query);
  url.searchParams.set('image_type', 'photo');
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('page', String(page));
  url.searchParams.set('safesearch', 'true');
  url.searchParams.set('orientation', 'horizontal');
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Pixabay API error: ${res.status}`);
  return res.json() as Promise<PixabaySearchResult<PixabayImage>>;
}

export async function searchPixabayVideos(
  query: string,
  page = 1,
  perPage = 20,
): Promise<PixabaySearchResult<PixabayVideo>> {
  if (!PIXABAY_KEY) throw new Error('PIXABAY_API_KEY not configured');
  const url = new URL('https://pixabay.com/api/videos/');
  url.searchParams.set('key', PIXABAY_KEY);
  url.searchParams.set('q', query);
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('page', String(page));
  url.searchParams.set('safesearch', 'true');
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Pixabay API error: ${res.status}`);
  return res.json() as Promise<PixabaySearchResult<PixabayVideo>>;
}
