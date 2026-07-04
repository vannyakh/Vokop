/**
 * Studio asset support — icons, fonts, and images from `apps/web/src/assets`.
 */
export {
  ASSET_ICONS,
  STUDIO_TOOL_ASSET_ICONS,
  getAssetIcon,
  getStudioToolAssetIcon,
  type AssetIconName,
  type StudioToolAssetIconId,
} from './icons';

export {
  LOCAL_FONTS,
  isLocalFont,
  loadLocalFont,
  preloadLocalFonts,
  type LocalFont,
  type LocalFontCategory,
} from './fonts';

export {
  ASSET_IMAGES,
  getFilterPreviewImage,
} from './images';

export {
  TRANSITION_PREVIEW_GIFS,
  TRANSITION_PREVIEW_BY_ID,
  getTransitionPreview,
  getTransitionPreviewByIndex,
} from './transitions';

export {
  EFFECT_CATALOG_CATEGORIES,
  EFFECT_CATALOG_ITEMS,
  EFFECT_QUICK_TAGS,
  EFFECT_PREVIEW_BY_ID,
  getEffectPreview,
  getEffectCatalogItems,
  searchEffectCatalog,
  type EffectApplyId,
  type EffectCatalogItem,
  type EffectPreviewResolved,
} from './effects';

export { AssetIcon, type AssetIconProps } from './AssetIcon';
