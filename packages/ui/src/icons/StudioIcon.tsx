import type { SVGAttributes } from 'react';
import { cn } from '../lib/cn.js';
import { STUDIO_ICONS, type StudioIconName } from './registry.js';

export interface StudioIconProps extends Omit<SVGAttributes<SVGSVGElement>, 'children'> {
  name: StudioIconName;
  /** Pixel size (width & height). Default 16. */
  size?: number;
}

/**
 * Shared studio icon — paths adapted from Omniclip (`s/icons`).
 * Use with `IconButton` or toolbar buttons; color via `currentColor` / className.
 */
export function StudioIcon({ name, size = 16, className, ...rest }: StudioIconProps) {
  const icon = STUDIO_ICONS[name];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={icon.viewBox}
      fill="none"
      aria-hidden={rest['aria-label'] || rest['aria-labelledby'] ? undefined : true}
      className={cn('shrink-0', className)}
      {...rest}
    >
      {icon.paths.map((d) => (
        <path
          key={d.slice(0, 24)}
          d={d}
          fill="currentColor"
          fillRule={icon.fillRule}
          clipRule={icon.fillRule === 'evenodd' ? 'evenodd' : undefined}
        />
      ))}
    </svg>
  );
}
