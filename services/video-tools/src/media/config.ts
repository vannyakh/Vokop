// Read lazily so dotenv.config() in index.ts has already run by call time.
export function hasPixabayKey(): boolean {
  return Boolean(process.env.PIXABAY_API_KEY);
}

export function hasGiphyKey(): boolean {
  return Boolean(process.env.GIPHY_API_KEY);
}

export function mediaCacheTtl(): number {
  return Number(process.env.MEDIA_CACHE_TTL_SEC ?? 300);
}

export function getPixabayKey(): string {
  const key = process.env.PIXABAY_API_KEY ?? '';
  if (!key) throw new Error('PIXABAY_API_KEY not configured on server');
  return key;
}

export function getGiphyKey(): string {
  const key = process.env.GIPHY_API_KEY ?? '';
  if (!key) throw new Error('GIPHY_API_KEY not configured on server');
  return key;
}
