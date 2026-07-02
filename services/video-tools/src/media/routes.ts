import { Router } from 'express';
import {
  giphyStickersResponseSchema,
  mediaStatusResponseSchema,
  pixabayImageSearchResponseSchema,
  pixabayVideoSearchResponseSchema,
  textEffectPreviewsResponseSchema,
  toApiResponse,
} from '@vokop/api';
import { trendingGiphyStickers, searchGiphyStickers } from './giphy.js';
import { hasGiphyKey, hasPixabayKey } from './config.js';
import { searchPixabayImages, searchPixabayVideos } from './pixabay.js';
import { getTextEffectPreviews } from './textEffects.js';

export function createMediaRouter(): Router {
  const router = Router();

  router.get('/status', (_req, res) => {
    res.json(
      toApiResponse(mediaStatusResponseSchema, {
        pixabay: hasPixabayKey(),
        giphy: hasGiphyKey(),
      }),
    );
  });

  router.get('/pixabay/images', async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      res.status(400).json({ error: 'Missing query parameter q' });
      return;
    }

    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const perPage = Math.min(50, Math.max(1, Number(req.query.perPage) || 20));
      const result = await searchPixabayImages(q, page, perPage);
      res.json(toApiResponse(pixabayImageSearchResponseSchema, result));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Pixabay search failed';
      res.status(hasPixabayKey() ? 502 : 503).json({ error: message });
    }
  });

  router.get('/pixabay/videos', async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      res.status(400).json({ error: 'Missing query parameter q' });
      return;
    }

    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const perPage = Math.min(50, Math.max(1, Number(req.query.perPage) || 20));
      const result = await searchPixabayVideos(q, page, perPage);
      res.json(toApiResponse(pixabayVideoSearchResponseSchema, result));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Pixabay search failed';
      res.status(hasPixabayKey() ? 502 : 503).json({ error: message });
    }
  });

  router.get('/giphy/stickers/trending', async (req, res) => {
    try {
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const stickers = await trendingGiphyStickers(limit, offset);
      res.json(toApiResponse(giphyStickersResponseSchema, { stickers }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Giphy trending failed';
      res.status(hasGiphyKey() ? 502 : 503).json({ error: message });
    }
  });

  router.get('/giphy/stickers/search', async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      res.status(400).json({ error: 'Missing query parameter q' });
      return;
    }

    try {
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const stickers = await searchGiphyStickers(q, limit, offset);
      res.json(toApiResponse(giphyStickersResponseSchema, { stickers }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Giphy search failed';
      res.status(hasGiphyKey() ? 502 : 503).json({ error: message });
    }
  });

  router.get('/text-effects/previews', async (_req, res) => {
    try {
      const result = await getTextEffectPreviews();
      res.json(toApiResponse(textEffectPreviewsResponseSchema, result));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Text effect previews failed';
      res.status(hasPixabayKey() ? 502 : 503).json({ error: message });
    }
  });

  return router;
}
