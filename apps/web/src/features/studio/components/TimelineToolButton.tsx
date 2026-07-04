import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TimelineToolButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  tone?: 'default' | 'ai';
  children: ReactNode;
}

/** Shared icon control for the timeline editing / view toolbar. */
export function TimelineToolButton({
  active,
  tone = 'default',
  className,
  children,
  ...rest
}: TimelineToolButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'studio-playback-icon-btn',
        tone === 'ai' && 'studio-playback-ai',
        active && (tone === 'ai' ? 'active' : 'studio-playback-icon-btn--active'),
        className,
      )}
      aria-pressed={active}
      {...rest}
    >
      {children}
    </button>
  );
}
