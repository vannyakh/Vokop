import { getRedis } from '@vokop/db';
import type { PixabayImage, PixabayVideo } from '@vokop/api';
import { config } from '../../config.js';

export function hasPixabayKey(): boolean { return Boolean(config.PIXABAY_API_KEY); }
function getPixabayKey(): string {
  if (!config.PIXABAY_API_KEY) throw new Error('PIXABAY_API_KEY not configured on server');
  return config.PIXABAY_API_KEY;
}
function mediaCacheTtl(): number { return config.MEDIA_CACHE_TTL_SEC; }

export interface PixabaySearchResult<T> { total: number; totalHits: number; hits: T[] }

async function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const redis = getRedis();
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
    const data = await fetcher();
    await redis.setEx(key, mediaCacheTtl(), JSON.stringify(data));
    return data;
  } catch { return fetcher(); }
}

export async function searchPixabayImages(
  query: string, page = 1, perPage = 20,
): Promise<PixabaySearchResult<PixabayImage>> {
  if (!hasPixabayKey()) throw new Error('Pixabay API not configured');
  return cachedFetch(`vokop:media:pixabay:images:${query}:${page}:${perPage}`, async () => {
    const url = new URL('https://pixabay.com/api/');
    url.searchParams.set('key', getPixabayKey());
    url.searchParams.set('q', query);
    url.searchParams.set('image_type', 'photo');
    url.searchParams.set('per_page', String(perPage));
    url.searchParams.set('page', String(page));
    url.searchParams.set('safesearch', 'true');
    url.searchParams.set('orientation', 'horizontal');
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Pixabay API error: ${res.status}`);
    return res.json() as Promise<PixabaySearchResult<PixabayImage>>;
  });
}

export async function searchPixabayVideos(
  query: string, page = 1, perPage = 20,
): Promise<PixabaySearchResult<PixabayVideo>> {
  if (!hasPixabayKey()) throw new Error('Pixabay API not configured');
  return cachedFetch(`vokop:media:pixabay:videos:${query}:${page}:${perPage}`, async () => {
    const url = new URL('https://pixabay.com/api/videos/');
    url.searchParams.set('key', getPixabayKey());
    url.searchParams.set('q', query);
    url.searchParams.set('per_page', String(perPage));
    url.searchParams.set('page', String(page));
    url.searchParams.set('safesearch', 'true');
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Pixabay API error: ${res.status}`);
    return res.json() as Promise<PixabaySearchResult<PixabayVideo>>;
  });
}
