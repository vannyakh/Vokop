import { api } from '@/lib/api';
import type { PixabayImage, PixabayVideo } from '@vokop/api';

export type { PixabayImage, PixabayVideo };

export type PixabayImageSearchResult = Awaited<ReturnType<typeof api.searchPixabayImages>>;
export type PixabayVideoSearchResult = Awaited<ReturnType<typeof api.searchPixabayVideos>>;

/** @deprecated Use PixabayImageSearchResult or PixabayVideoSearchResult */
export type PixabaySearchResult<T> = PixabayImageSearchResult & { hits: T[] };

export async function searchPixabayImages(
  query: string,
  page = 1,
  perPage = 20,
): Promise<PixabayImageSearchResult> {
  return api.searchPixabayImages(query, page, perPage);
}

export async function searchPixabayVideos(
  query: string,
  page = 1,
  perPage = 20,
): Promise<PixabayVideoSearchResult> {
  return api.searchPixabayVideos(query, page, perPage);
}
