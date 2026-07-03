import { useTheme } from '@/context/ThemeContext';
import logoDark from '@/assets/images/logo-dark.png';
import logoLight from '@/assets/images/logo-light.png';

export interface VokopLogoProps {
  className?: string;
  alt?: string;
  variant?: 'dark' | 'light';
}

/** Theme-aware Vokop wordmark for the admin shell. */
export function VokopLogo({ className, alt = 'Vokop', variant }: VokopLogoProps) {
  const { theme } = useTheme();
  const resolved = variant ?? (theme === 'light' ? 'light' : 'dark');
  const src = resolved === 'light' ? logoLight : logoDark;

  return (
    <img
      src={src}
      alt={alt}
      className={['block h-8 w-auto max-w-full object-contain object-left select-none', className]
        .filter(Boolean)
        .join(' ')}
      draggable={false}
    />
  );
}
