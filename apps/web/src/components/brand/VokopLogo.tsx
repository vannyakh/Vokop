import { cn } from '@/lib/cn';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import logoDark from '@/assets/images/logo-dark.png';
import logoLight from '@/assets/images/logo-light.png';

export interface VokopLogoProps {
  className?: string;
  alt?: string;
  /** Force a variant instead of following the active color theme. */
  variant?: 'dark' | 'light';
}

/** Theme-aware Vokop wordmark — `logo-dark` on dark UI, `logo-light` on light UI. */
export function VokopLogo({ className, alt = 'Vokop', variant }: VokopLogoProps) {
  const colorTheme = useSettingsStore((s) => s.colorTheme);
  const resolved = variant ?? (colorTheme === 'light' ? 'light' : 'dark');
  const src = resolved === 'light' ? logoLight : logoDark;

  return (
    <img
      src={src}
      alt={alt}
      className={cn('block h-8 w-auto max-w-full object-contain object-left select-none', className)}
      draggable={false}
    />
  );
}
