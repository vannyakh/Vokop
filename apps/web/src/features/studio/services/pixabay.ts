import { api } from '@/lib/api/client';
import type { PixabayImage, PixabayVideo } from '@vokop/api';

export type { PixabayImage, PixabayVideo };

export interface PixabaySearchResult<T> {
  total: number;
  totalHits: number;
  hits: T[];
}

export async function searchPixabayImages(
  query: string,
  page = 1,
  perPage = 20,
): Promise<PixabaySearchResult<PixabayImage>> {
  return api.searchPixabayImages(query, page, perPage);
}

export async function searchPixabayVideos(
  query: string,
  page = 1,
  perPage = 20,
): Promise<PixabaySearchResult<PixabayVideo>> {
  return api.searchPixabayVideos(query, page, perPage);
}
