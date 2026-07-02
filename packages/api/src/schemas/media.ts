import { z } from 'zod';

export const mediaStatusResponseSchema = z.object({
  pixabay: z.boolean(),
  giphy: z.boolean(),
});

export const pixabayImageSchema = z.object({
  id: z.number(),
  previewURL: z.string(),
  webformatURL: z.string(),
  largeImageURL: z.string(),
  tags: z.string(),
  imageWidth: z.number(),
  imageHeight: z.number(),
  type: z.string(),
  user: z.string(),
  views: z.number(),
  downloads: z.number(),
  likes: z.number(),
});

export const pixabayVideoSchema = z.object({
  id: z.number(),
  tags: z.string(),
  duration: z.number(),
  user: z.string(),
  views: z.number(),
  downloads: z.number(),
  likes: z.number(),
  videos: z.object({
    large: z.object({
      url: z.string(),
      width: z.number(),
      height: z.number(),
      picture_id: z.string(),
    }),
    medium: z.object({ url: z.string(), width: z.number(), height: z.number() }),
    small: z.object({ url: z.string(), width: z.number(), height: z.number() }),
    tiny: z.object({ url: z.string(), width: z.number(), height: z.number() }),
  }),
});

export const pixabayImageSearchResponseSchema = z.object({
  total: z.number(),
  totalHits: z.number(),
  hits: z.array(pixabayImageSchema),
});

export const pixabayVideoSearchResponseSchema = z.object({
  total: z.number(),
  totalHits: z.number(),
  hits: z.array(pixabayVideoSchema),
});

/** @deprecated Use pixabayImageSearchResponseSchema or pixabayVideoSearchResponseSchema */
export const pixabaySearchResponseSchema = pixabayImageSearchResponseSchema;

export const giphyStickerSchema = z.object({
  id: z.string(),
  title: z.string(),
  previewUrl: z.string(),
  url: z.string(),
  width: z.number(),
  height: z.number(),
});

export const giphyStickersResponseSchema = z.object({
  stickers: z.array(giphyStickerSchema),
});

export const textEffectPreviewSchema = z.object({
  effectId: z.string(),
  category: z.enum(['glow', 'outline', 'shadow', 'creative']),
  sampleText: z.string(),
  previewURL: z.string(),
  webformatURL: z.string(),
  largeImageURL: z.string().optional(),
});

export const textEffectPreviewsResponseSchema = z.object({
  previews: z.array(textEffectPreviewSchema),
  pixabayEnabled: z.boolean(),
});

export type MediaStatusResponse = z.infer<typeof mediaStatusResponseSchema>;
export type PixabayImage = z.infer<typeof pixabayImageSchema>;
export type PixabayVideo = z.infer<typeof pixabayVideoSchema>;
export type GiphySticker = z.infer<typeof giphyStickerSchema>;
export type TextEffectPreview = z.infer<typeof textEffectPreviewSchema>;
export type TextEffectPreviewsResponse = z.infer<typeof textEffectPreviewsResponseSchema>;
