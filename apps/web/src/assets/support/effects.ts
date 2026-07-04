/**
 * Effect preview images from `apps/web/src/assets/effects/previews/`.
 *
 * Place files named by catalog item id, e.g.:
 *   text-fireworks-ii.webp
 *   bouncing-snow.png
 */
import { getFilterPreviewImage } from './images';
import {
  EFFECT_CATALOG_CATEGORIES,
  EFFECT_CATALOG_ITEMS,
  type EffectApplyId,
  type EffectCatalogItem,
} from './effectsCatalog';

const previewModules = import.meta.glob('../effects/previews/*.{webp,png,jpg,jpeg,gif,awebp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function idFromPath(path: string): string | null {
  const match = path.match(/\/([^/]+)\.(webp|png|jpe?g|gif|awebp)$/i);
  return match?.[1] ?? null;
}

/** Map of catalog item id → bundled preview URL. */
export const EFFECT_PREVIEW_BY_ID: Record<string, string> = Object.fromEntries(
  Object.entries(previewModules).flatMap(([path, url]) => {
    const id = idFromPath(path);
    return id ? [[id, url]] : [];
  }),
);

/** Browser-only fallback styles when a downloaded preview is missing. */
const APPLY_FALLBACK_STYLE: Record<
  EffectApplyId,
  { filter?: string; transform?: string; overlay?: string }
> = {
  none: {},
  vignette: {
    filter: 'brightness(0.92) contrast(1.08)',
    overlay:
      'radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.72) 100%)',
  },
  grain: {
    filter: 'contrast(1.08) brightness(1.02) saturate(0.95)',
  },
  sharpen: {
    filter: 'contrast(1.28) saturate(1.05)',
  },
  glow: {
    filter: 'brightness(1.12) contrast(0.92) saturate(1.1)',
    overlay:
      'radial-gradient(ellipse at center, rgba(255,255,255,0.22) 0%, transparent 62%)',
  },
  mirror: {
    transform: 'scaleX(-1)',
  },
};

export interface EffectPreviewResolved {
  src: string;
  filter?: string;
  transform?: string;
  overlay?: string;
  /** True when using a downloaded asset file. */
  hasAsset: boolean;
}

export function getEffectPreview(item: EffectCatalogItem): EffectPreviewResolved {
  const asset = EFFECT_PREVIEW_BY_ID[item.id];
  if (asset) {
    return { src: asset, hasAsset: true };
  }
  const fallback = APPLY_FALLBACK_STYLE[item.applyId] ?? {};
  return {
    src: getFilterPreviewImage(),
    filter: fallback.filter,
    transform: fallback.transform,
    overlay: fallback.overlay,
    hasAsset: false,
  };
}

export function getEffectCatalogItems(categoryId?: string): EffectCatalogItem[] {
  if (!categoryId || categoryId === 'all') return EFFECT_CATALOG_ITEMS;
  return EFFECT_CATALOG_ITEMS.filter((item) => item.categoryId === categoryId);
}

export function searchEffectCatalog(query: string): EffectCatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return EFFECT_CATALOG_ITEMS;
  return EFFECT_CATALOG_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.id.includes(q) ||
      item.categoryId.includes(q),
  );
}

export {
  EFFECT_CATALOG_CATEGORIES,
  EFFECT_CATALOG_ITEMS,
  EFFECT_QUICK_TAGS,
  type EffectApplyId,
  type EffectCatalogItem,
} from './effectsCatalog';
