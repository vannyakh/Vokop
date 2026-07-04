/**
 * Studio tool / UI icons from `apps/web/src/assets`.
 * Prefer these over remote or ad-hoc icon sources in studio surfaces.
 */
import audioIcon from '@/assets/audio.svg';
import effectIcon from '@/assets/effect.svg';
import easeIcon from '@/assets/ease.svg';
import imagesIcon from '@/assets/images.svg';
import textIcon from '@/assets/text.svg';
import transitionIcon from '@/assets/transition.svg';
import trimIcon from '@/assets/trim.svg';
import splitIcon from '@/assets/split.svg';
import performanceIcon from '@/assets/performance.svg';
import highResIcon from '@/assets/high-res.svg';
import secureIcon from '@/assets/secure.svg';
import hamburgerIcon from '@/assets/hamburger.svg';
import loadingIcon from '@/assets/loading.svg';
import noiseIcon from '@/assets/noise.svg';
import ellipseIcon from '@/assets/ellipse.svg';
import templatePreviewIcon from '@/assets/template-preview.svg';

export type AssetIconName =
  | 'audio'
  | 'effect'
  | 'ease'
  | 'images'
  | 'text'
  | 'transition'
  | 'trim'
  | 'split'
  | 'performance'
  | 'highRes'
  | 'secure'
  | 'hamburger'
  | 'loading'
  | 'noise'
  | 'ellipse'
  | 'templatePreview';

export const ASSET_ICONS: Record<AssetIconName, string> = {
  audio: audioIcon,
  effect: effectIcon,
  ease: easeIcon,
  images: imagesIcon,
  text: textIcon,
  transition: transitionIcon,
  trim: trimIcon,
  split: splitIcon,
  performance: performanceIcon,
  highRes: highResIcon,
  secure: secureIcon,
  hamburger: hamburgerIcon,
  loading: loadingIcon,
  noise: noiseIcon,
  ellipse: ellipseIcon,
  templatePreview: templatePreviewIcon,
};

/** Map studio tool ids to bundled asset icons. */
export const STUDIO_TOOL_ASSET_ICONS = {
  media: ASSET_ICONS.images,
  text: ASSET_ICONS.text,
  audio: ASSET_ICONS.audio,
  voice: ASSET_ICONS.audio,
  captions: ASSET_ICONS.text,
  effects: ASSET_ICONS.effect,
  transitions: ASSET_ICONS.transition,
  filters: ASSET_ICONS.ease,
} as const;

export type StudioToolAssetIconId = keyof typeof STUDIO_TOOL_ASSET_ICONS;

export function getAssetIcon(name: AssetIconName): string {
  return ASSET_ICONS[name];
}

export function getStudioToolAssetIcon(toolId: StudioToolAssetIconId): string {
  return STUDIO_TOOL_ASSET_ICONS[toolId];
}
