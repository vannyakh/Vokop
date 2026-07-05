import type { ReactNode } from 'react';
import { VokopModal, type VokopModalProps } from '@vokop/ui';
import { cn } from '@/lib/cn';
import { STUDIO_MODAL_STYLES } from '@/features/studio/lib/studioModalTheme';

export interface StudioHeaderModalShellProps extends Omit<VokopModalProps, 'title' | 'subtitle' | 'styles'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  styles?: VokopModalProps['styles'];
}

export function StudioHeaderModalShell({
  className,
  title,
  subtitle,
  children,
  draggable = true,
  styles,
  ...props
}: StudioHeaderModalShellProps) {
  return (
    <VokopModal
      className={cn('studio-modal studio-header-modal', className)}
      styles={{ ...STUDIO_MODAL_STYLES, ...styles }}
      draggable={draggable}
      title={null}
      {...props}
    >
      {title != null || subtitle != null ? (
        <header className="studio-modal-head vokop-modal-drag-handle">
          {title != null ? <h2 className="studio-modal-head__title">{title}</h2> : null}
          {subtitle != null ? <p className="studio-modal-head__subtitle">{subtitle}</p> : null}
        </header>
      ) : null}
      {children}
    </VokopModal>
  );
}

export { VokopModalTitle as StudioHeaderModalTitle } from '@vokop/ui';
