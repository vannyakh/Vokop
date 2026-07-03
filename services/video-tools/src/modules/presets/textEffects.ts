import { getRedis } from '@vokop/db';
import { TEXT_EFFECT_SEEDS, type TextEffectSeed } from '@vokop/shared';
import type { PixabayImage, TextEffectPreview } from '@vokop/api';
import { hasPixabayKey, searchPixabayImages } from '../stock/pixabay.js';
import { config } from '../../config.js';

const CACHE_KEY = 'vokop:media:text-effect-previews';

function pickHit(hits: PixabayImage[], seed: string): PixabayImage | undefined {
  if (!hits.length) return undefined;
  let idx = 0;
  for (const char of seed) idx = (idx + char.charCodeAt(0)) % hits.length;
  return hits[idx];
}

async function previewForSeed(seed: TextEffectSeed): Promise<TextEffectPreview> {
  const fallback: TextEffectPreview = {
    effectId: seed.effectId,
    category: seed.category,
    sampleText: seed.sampleText,
    previewURL: '',
    webformatURL: '',
  };
  if (!hasPixabayKey()) return fallback;
  try {
    const result = await searchPixabayImages(seed.previewQuery, 1, 5);
    const hit = pickHit(result.hits, seed.effectId);
    if (!hit) return fallback;
    return { effectId: seed.effectId, category: seed.category, sampleText: seed.sampleText, previewURL: hit.previewURL, webformatURL: hit.webformatURL, largeImageURL: hit.largeImageURL };
  } catch { return fallback; }
}

export async function getTextEffectPreviews(): Promise<{ previews: TextEffectPreview[]; pixabayEnabled: boolean }> {
  const pixabayEnabled = hasPixabayKey();
  if (pixabayEnabled) {
    try {
      const cached = await getRedis().get(CACHE_KEY);
      if (cached) return JSON.parse(cached) as { previews: TextEffectPreview[]; pixabayEnabled: boolean };
    } catch { /* fall through */ }
  }
  const previews = await Promise.all(TEXT_EFFECT_SEEDS.map((s) => previewForSeed(s)));
  const payload = { previews, pixabayEnabled };
  if (pixabayEnabled && previews.some((p) => p.previewURL)) {
    try { await getRedis().setEx(CACHE_KEY, config.MEDIA_CACHE_TTL_SEC, JSON.stringify(payload)); } catch { /* ignore */ }
  }
  return payload;
}
