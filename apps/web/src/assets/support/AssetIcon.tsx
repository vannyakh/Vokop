import { cn } from '@/lib/cn';
import { ASSET_ICONS, type AssetIconName } from './icons';

export interface AssetIconProps {
  name: AssetIconName;
  /** Pixel size (width & height). Default 20. */
  size?: number;
  className?: string;
  alt?: string;
}

/** Renders a bundled SVG/PNG icon from `apps/web/src/assets`. */
export function AssetIcon({ name, size = 20, className, alt = '' }: AssetIconProps) {
  return (
    <img
      src={ASSET_ICONS[name]}
      width={size}
      height={size}
      alt={alt}
      draggable={false}
      className={cn('asset-icon shrink-0 select-none', className)}
      aria-hidden={alt ? undefined : true}
    />
  );
}
