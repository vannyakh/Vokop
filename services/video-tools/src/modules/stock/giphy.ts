import { getRedis } from '@vokop/db';
import type { GiphySticker } from '@vokop/api';
import { config } from '../../config.js';

export function hasGiphyKey(): boolean { return Boolean(config.GIPHY_API_KEY); }
function getGiphyKey(): string {
  if (!config.GIPHY_API_KEY) throw new Error('GIPHY_API_KEY not configured on server');
  return config.GIPHY_API_KEY;
}
function mediaCacheTtl(): number { return config.MEDIA_CACHE_TTL_SEC; }

interface GiphyImageSet { url: string; width: string; height: string }
interface GiphyStickerItem {
  id: string;
  title: string;
  images: {
    fixed_height_small?: GiphyImageSet;
    fixed_height?: GiphyImageSet;
    downsized_medium?: GiphyImageSet;
    original?: GiphyImageSet;
  };
}
interface GiphyResponse { data: GiphyStickerItem[] }

function mapSticker(item: GiphyStickerItem): GiphySticker {
  const preview = item.images.fixed_height_small?.url ?? item.images.fixed_height?.url ?? item.images.downsized_medium?.url ?? item.images.original?.url ?? '';
  const full = item.images.downsized_medium?.url ?? item.images.fixed_height?.url ?? item.images.original?.url ?? preview;
  const w = Number(item.images.fixed_height?.width ?? item.images.original?.width ?? 200);
  const h = Number(item.images.fixed_height?.height ?? item.images.original?.height ?? 200);
  return { id: item.id, title: item.title || 'Sticker', previewUrl: preview, url: full, width: w || 200, height: h || 200 };
}

async function giphyFetch(path: string, params: Record<string, string>): Promise<GiphyResponse> {
  const url = new URL(`https://api.giphy.com/v1/stickers/${path}`);
  url.searchParams.set('api_key', getGiphyKey());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Giphy API error: ${res.status}`);
  return res.json() as Promise<GiphyResponse>;
}

async function cachedStickers(key: string, fetcher: () => Promise<GiphySticker[]>): Promise<GiphySticker[]> {
  try {
    const redis = getRedis();
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as GiphySticker[];
    const data = await fetcher();
    await redis.setEx(key, mediaCacheTtl(), JSON.stringify(data));
    return data;
  } catch { return fetcher(); }
}

export async function trendingGiphyStickers(limit = 10, offset = 0): Promise<GiphySticker[]> {
  if (!hasGiphyKey()) throw new Error('Giphy API not configured');
  return cachedStickers(`vokop:media:giphy:trending:${limit}:${offset}`, async () => {
    const res = await giphyFetch('trending', { limit: String(limit), offset: String(offset), rating: 'g' });
    return res.data.map(mapSticker);
  });
}

export async function searchGiphyStickers(query: string, limit = 10, offset = 0): Promise<GiphySticker[]> {
  if (!hasGiphyKey()) throw new Error('Giphy API not configured');
  return cachedStickers(`vokop:media:giphy:search:${query}:${limit}:${offset}`, async () => {
    const res = await giphyFetch('search', { q: query, limit: String(limit), offset: String(offset), rating: 'g' });
    return res.data.map(mapSticker);
  });
}
