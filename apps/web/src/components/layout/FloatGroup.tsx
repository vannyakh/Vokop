import { cn } from '@/lib/cn';
import { VokopLogo } from '@/components/brand/VokopLogo';

interface FloatGroupProps {
  children: React.ReactNode;
  className?: string;
  theme?: 'light' | 'dark';
}

export function FloatGroup({ children, className, theme = 'light' }: FloatGroupProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-full',
        theme === 'light' ? 'float-group-light' : 'studio-float',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface BrandLogoProps {
  onClick?: () => void;
  className?: string;
  /** @deprecated Round icon style is unused with image logos. */
  round?: boolean;
}

export function BrandLogo({ onClick, className }: BrandLogoProps) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'studio-brand-logo shrink-0 flex items-center',
        onClick && 'cursor-pointer transition-opacity hover:opacity-90 active:opacity-80',
        className,
      )}
    >
      <VokopLogo className="h-full w-auto" />
    </Tag>
  );
}

interface FloatDividerProps {
  theme?: 'light' | 'dark';
}

export function FloatDivider({ theme: _theme = 'light' }: FloatDividerProps) {
  return <div className="float-divider" />;
}

interface FloatIconButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
  theme?: 'light' | 'dark';
  active?: boolean;
}

export function FloatIconButton({
  onClick,
  children,
  title,
  active,
}: FloatIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn('float-icon-btn', active && 'active')}
    >
      {children}
    </button>
  );
}

interface FloatActionProps {
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
  title?: string;
  variant?: 'default' | 'primary';
  theme?: 'light' | 'dark';
}

export function FloatAction({
  onClick,
  href,
  children,
  title,
  variant = 'default',
}: FloatActionProps) {
  const className = cn(
    'float-action flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-full transition-all',
    variant === 'primary' ? 'btn-accent text-xs' : 'float-icon-btn w-auto px-3',
  );

  if (href) {
    return (
      <a href={href} title={title} className={className} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} title={title} className={className}>
      {children}
    </button>
  );
}
