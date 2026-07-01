import type { GiphySticker } from '@/features/studio/services/giphy';

export type StickerCategory = {
  id: string;
  title: string;
  emoji?: string;
  /** Giphy search query; omit for trending row */
  query?: string;
};

/** Demo stickers when no Giphy API key is configured (public Giphy CDN URLs). */
export const FALLBACK_STICKERS: GiphySticker[] = [
  {
    id: 'demo-1',
    title: 'Thumbs up',
    previewUrl: 'https://media.giphy.com/media/3o7aCTPPm4OHfRbKHm/200.gif',
    url: 'https://media.giphy.com/media/3o7aCTPPm4OHfRbKHm/giphy.gif',
    width: 200,
    height: 200,
  },
  {
    id: 'demo-2',
    title: 'Celebrate',
    previewUrl: 'https://media.giphy.com/media/l0MYC0LajboPxzQqY/200.gif',
    url: 'https://media.giphy.com/media/l0MYC0LajboPxzQqY/giphy.gif',
    width: 200,
    height: 200,
  },
  {
    id: 'demo-3',
    title: 'Heart',
    previewUrl: 'https://media.giphy.com/media/26BRv0ThfloryHCbew/200.gif',
    url: 'https://media.giphy.com/media/26BRv0ThfloryHCbew/giphy.gif',
    width: 200,
    height: 200,
  },
  {
    id: 'demo-4',
    title: 'Fire',
    previewUrl: 'https://media.giphy.com/media/3o6Zt481isNVkbding/200.gif',
    url: 'https://media.giphy.com/media/3o6Zt481isNVkbding/giphy.gif',
    width: 200,
    height: 200,
  },
  {
    id: 'demo-5',
    title: 'Wow',
    previewUrl: 'https://media.giphy.com/media/5VKbvrjbbT0sM/200.gif',
    url: 'https://media.giphy.com/media/5VKbvrjbbT0sM/giphy.gif',
    width: 200,
    height: 200,
  },
  {
    id: 'demo-6',
    title: 'Clap',
    previewUrl: 'https://media.giphy.com/media/7BFvGaj0UP6/200.gif',
    url: 'https://media.giphy.com/media/7BFvGaj0UP6/giphy.gif',
    width: 200,
    height: 200,
  },
  {
    id: 'demo-7',
    title: 'Laugh',
    previewUrl: 'https://media.giphy.com/media/13CoXDiaCcGy95/200.gif',
    url: 'https://media.giphy.com/media/13CoXDiaCcGy95/giphy.gif',
    width: 200,
    height: 200,
  },
  {
    id: 'demo-8',
    title: 'Star',
    previewUrl: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/200.gif',
    url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif',
    width: 200,
    height: 200,
  },
  {
    id: 'demo-9',
    title: 'Dance',
    previewUrl: 'https://media.giphy.com/media/l0HlBO7eyXgtktMrQ/200.gif',
    url: 'https://media.giphy.com/media/l0HlBO7eyXgtktMrQ/giphy.gif',
    width: 200,
    height: 200,
  },
  {
    id: 'demo-10',
    title: 'Cool',
    previewUrl: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/200.gif',
    url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
    width: 200,
    height: 200,
  },
];

export const STICKER_CATEGORIES: StickerCategory[] = [
  { id: 'trending', title: 'Trending' },
  { id: 'football', title: 'Football', emoji: '⚽️', query: 'football sticker' },
  { id: 'classic', title: 'Classic', query: 'classic emoji sticker' },
  { id: 'hits', title: 'Hits', query: 'viral sticker' },
  { id: 'social', title: 'Social media', query: 'social media sticker' },
  { id: 'vlog', title: 'Vlog', query: 'vlog sticker' },
  { id: 'retro', title: 'Retro', query: 'retro sticker' },
  { id: 'title', title: 'Title', query: 'title text sticker' },
  { id: 'music', title: 'Music', query: 'music sticker' },
  { id: 'sports', title: 'Sports', query: 'sports sticker' },
  { id: 'food', title: 'Food', query: 'food sticker' },
  { id: 'summer', title: 'Summer', query: 'summer sticker' },
  { id: 'caption', title: 'Caption', query: 'caption sticker' },
  { id: 'game', title: 'Game', query: 'gaming sticker' },
  { id: 'pet', title: 'Pet', query: 'pet animal sticker' },
  { id: 'tech', title: 'Technology', query: 'technology sticker' },
  { id: 'campus', title: 'Campus', query: 'school campus sticker' },
  { id: 'outro', title: 'Outro', query: 'subscribe outro sticker' },
];

export function fallbackStickersForCategory(categoryId: string, count = 10): GiphySticker[] {
  const start = categoryId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % FALLBACK_STICKERS.length;
  const items: GiphySticker[] = [];
  for (let i = 0; i < count; i++) {
    const base = FALLBACK_STICKERS[(start + i) % FALLBACK_STICKERS.length];
    items.push({ ...base, id: `${categoryId}-${base.id}-${i}` });
  }
  return items;
}
