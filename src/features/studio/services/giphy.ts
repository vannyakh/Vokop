const GIPHY_KEY =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GIPHY_API_KEY ?? '';

export interface GiphySticker {
  id: string;
  title: string;
  previewUrl: string;
  url: string;
  width: number;
  height: number;
}

interface GiphyImageSet {
  url: string;
  width: string;
  height: string;
}

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

interface GiphyResponse {
  data: GiphyStickerItem[];
  pagination?: { total_count: number; count: number; offset: number };
}

function mapSticker(item: GiphyStickerItem): GiphySticker {
  const preview =
    item.images.fixed_height_small?.url ??
    item.images.fixed_height?.url ??
    item.images.downsized_medium?.url ??
    item.images.original?.url ??
    '';
  const full =
    item.images.downsized_medium?.url ??
    item.images.fixed_height?.url ??
    item.images.original?.url ??
    preview;
  const w = Number(item.images.fixed_height?.width ?? item.images.original?.width ?? 200);
  const h = Number(item.images.fixed_height?.height ?? item.images.original?.height ?? 200);
  return {
    id: item.id,
    title: item.title || 'Sticker',
    previewUrl: preview,
    url: full,
    width: w || 200,
    height: h || 200,
  };
}

export function hasGiphyKey(): boolean {
  return GIPHY_KEY.length > 0;
}

async function giphyFetch(path: string, params: Record<string, string>): Promise<GiphyResponse> {
  if (!GIPHY_KEY) throw new Error('GIPHY_API_KEY not configured');
  const url = new URL(`https://api.giphy.com/v1/stickers/${path}`);
  url.searchParams.set('api_key', GIPHY_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Giphy API error: ${res.status}`);
  return res.json() as Promise<GiphyResponse>;
}

export async function trendingGiphyStickers(limit = 10, offset = 0): Promise<GiphySticker[]> {
  const res = await giphyFetch('trending', {
    limit: String(limit),
    offset: String(offset),
    rating: 'g',
  });
  return res.data.map(mapSticker);
}

export async function searchGiphyStickers(
  query: string,
  limit = 10,
  offset = 0,
): Promise<GiphySticker[]> {
  const res = await giphyFetch('search', {
    q: query,
    limit: String(limit),
    offset: String(offset),
    rating: 'g',
  });
  return res.data.map(mapSticker);
}
