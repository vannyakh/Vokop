const PIXABAY_KEY = process.env.PIXABAY_API_KEY ?? '';
const GIPHY_KEY = process.env.GIPHY_API_KEY ?? '';
const MEDIA_CACHE_TTL = Number(process.env.MEDIA_CACHE_TTL_SEC ?? 300);

export function hasPixabayKey(): boolean {
  return PIXABAY_KEY.length > 0;
}

export function hasGiphyKey(): boolean {
  return GIPHY_KEY.length > 0;
}

export function mediaCacheTtl(): number {
  return MEDIA_CACHE_TTL;
}

export function getPixabayKey(): string {
  if (!PIXABAY_KEY) throw new Error('PIXABAY_API_KEY not configured on server');
  return PIXABAY_KEY;
}

export function getGiphyKey(): string {
  if (!GIPHY_KEY) throw new Error('GIPHY_API_KEY not configured on server');
  return GIPHY_KEY;
}
