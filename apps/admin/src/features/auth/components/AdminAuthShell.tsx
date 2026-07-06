import type { ReactNode } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { motion } from 'motion/react';

export type AdminAuthVariant = 'page' | 'modal';

export interface AdminAuthShellProps {
  variant?: AdminAuthVariant;
  open?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  children: ReactNode;
}

export function AdminAuthShell({
  variant = 'modal',
  open = true,
  showBack = false,
  onBack,
  onClose,
  children,
}: AdminAuthShellProps) {
  const panel = (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 10 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className="admin-auth-panel"
      role="dialog"
      aria-modal={variant === 'modal'}
    >
      {showBack && onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="admin-auth-icon-btn admin-auth-icon-btn--back"
          aria-label="Back"
        >
          <ChevronLeft size={18} />
        </button>
      ) : null}

      {variant === 'modal' && onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="admin-auth-icon-btn admin-auth-icon-btn--close"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      ) : null}

      {children}
    </motion.div>
  );

  if (variant === 'page') {
    return <div className="admin-auth-page">{panel}</div>;
  }

  if (!open) return null;

  return (
    <div className="admin-auth-overlay">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="admin-auth-backdrop"
        aria-hidden="true"
        onClick={onClose}
      />
      {panel}
    </div>
  );
}

export interface AdminAuthHeaderProps {
  title: string;
  subtitle: string;
  subtitleVariant?: 'default' | 'email';
}

export function AdminAuthHeader({ title, subtitle, subtitleVariant = 'default' }: AdminAuthHeaderProps) {
  return (
    <div className="admin-auth-head">
      <h1 className="admin-auth-title">{title}</h1>
      <p
        className={
          subtitleVariant === 'email' ? 'admin-auth-subtitle admin-auth-subtitle--email' : 'admin-auth-subtitle'
        }
      >
        {subtitle}
      </p>
    </div>
  );
}
