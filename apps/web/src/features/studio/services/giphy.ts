import { api } from '@/lib/api';
import type { GiphySticker } from '@vokop/api';

export type { GiphySticker };

export async function trendingGiphyStickers(limit = 10, offset = 0): Promise<GiphySticker[]> {
  return api.trendingGiphyStickers(limit, offset);
}

export async function searchGiphyStickers(
  query: string,
  limit = 10,
  offset = 0,
): Promise<GiphySticker[]> {
  return api.searchGiphyStickers(query, limit, offset);
}
