import { Router } from 'express';
import {
  giphyStickersResponseSchema,
  mediaStatusResponseSchema,
  pixabayImageSearchResponseSchema,
  pixabayVideoSearchResponseSchema,
  textEffectPreviewsResponseSchema,
  toApiResponse,
} from '@vokop/api';
import { trendingGiphyStickers, searchGiphyStickers, hasGiphyKey } from './giphy.js';
import { hasPixabayKey, searchPixabayImages, searchPixabayVideos } from './pixabay.js';
import { getTextEffectPreviews } from '../presets/textEffects.js';

export function createStockRouter(): Router {
  const router = Router();

  router.get('/status', (_req, res) => {
    res.json(toApiResponse(mediaStatusResponseSchema, { pixabay: hasPixabayKey(), giphy: hasGiphyKey() }));
  });

  router.get('/pixabay/images', async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) { res.status(400).json({ error: 'Missing query parameter q' }); return; }
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const perPage = Math.min(50, Math.max(1, Number(req.query.perPage) || 20));
      res.json(toApiResponse(pixabayImageSearchResponseSchema, await searchPixabayImages(q, page, perPage)));
    } catch (err) {
      res.status(hasPixabayKey() ? 502 : 503).json({ error: (err as Error).message });
    }
  });

  router.get('/pixabay/videos', async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) { res.status(400).json({ error: 'Missing query parameter q' }); return; }
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const perPage = Math.min(50, Math.max(1, Number(req.query.perPage) || 20));
      res.json(toApiResponse(pixabayVideoSearchResponseSchema, await searchPixabayVideos(q, page, perPage)));
    } catch (err) {
      res.status(hasPixabayKey() ? 502 : 503).json({ error: (err as Error).message });
    }
  });

  router.get('/giphy/stickers/trending', async (req, res) => {
    try {
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
      const offset = Math.max(0, Number(req.query.offset) || 0);
      res.json(toApiResponse(giphyStickersResponseSchema, { stickers: await trendingGiphyStickers(limit, offset) }));
    } catch (err) {
      res.status(hasGiphyKey() ? 502 : 503).json({ error: (err as Error).message });
    }
  });

  router.get('/giphy/stickers/search', async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) { res.status(400).json({ error: 'Missing query parameter q' }); return; }
    try {
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
      const offset = Math.max(0, Number(req.query.offset) || 0);
      res.json(toApiResponse(giphyStickersResponseSchema, { stickers: await searchGiphyStickers(q, limit, offset) }));
    } catch (err) {
      res.status(hasGiphyKey() ? 502 : 503).json({ error: (err as Error).message });
    }
  });

  router.get('/text-effects/previews', async (_req, res) => {
    try {
      res.json(toApiResponse(textEffectPreviewsResponseSchema, await getTextEffectPreviews()));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
