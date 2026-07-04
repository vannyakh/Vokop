/**
 * Studio images / previews from `apps/web/src/assets`.
 */
import filterPreview from '@/assets/filter-preview.webp';
import logoDark from '@/assets/images/logo-dark.png';
import logoLight from '@/assets/images/logo-light.png';
import logoVokop from '@/assets/images/logo-vokop.png';
import vokopIcon from '@/assets/images/vokop.png';
import hLogoDark from '@/assets/images/h-logo-dark.png';
import hLogoLight from '@/assets/images/h-logo-light.png';
import projectThumb from '@/assets/images/project-01.png';

export {
  TRANSITION_PREVIEW_GIFS,
  TRANSITION_PREVIEW_BY_ID,
  getTransitionPreview,
  getTransitionPreviewByIndex,
} from './transitions';

export const ASSET_IMAGES = {
  filterPreview,
  logoDark,
  logoLight,
  logoVokop,
  vokopIcon,
  hLogoDark,
  hLogoLight,
  projectThumb,
} as const;

export function getFilterPreviewImage(): string {
  return ASSET_IMAGES.filterPreview;
}
