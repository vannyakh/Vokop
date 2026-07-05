import type { ReactNode } from 'react';
import { Tooltip } from '@vokop/ui/antd';
import { cn } from '@/lib/cn';

interface StudioHeaderIconActionProps {
  tooltip: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function StudioHeaderIconAction({
  tooltip,
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: StudioHeaderIconActionProps) {
  return (
    <Tooltip
      title={tooltip}
      placement="bottom"
      mouseEnterDelay={0.35}
      classNames={{ root: 'studio-header-tooltip' }}
    >
      <button
        type="button"
        className={cn('studio-header-icon-btn', active && 'studio-header-icon-btn--active')}
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </button>
    </Tooltip>
  );
}
