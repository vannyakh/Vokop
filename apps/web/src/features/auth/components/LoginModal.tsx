import { X, MonitorPlay } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '@/features/auth';
import { useTranslation } from '@/features/settings';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="auth-modal-google-icon" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const login = useAuthStore((s) => s.login);
  const { t } = useTranslation();

  const handleLogin = () => {
    login();
    onSuccess?.();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="auth-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-5 sm:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="auth-modal-backdrop absolute inset-0"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="auth-modal-panel relative w-full max-w-[440px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
          >
            <button
              type="button"
              onClick={onClose}
              className="auth-modal-close"
              aria-label="Close"
            >
              <X size={22} strokeWidth={2} />
            </button>

            <div className="auth-modal-brand">
              <div className="auth-modal-logo">
                <MonitorPlay size={28} strokeWidth={2} />
              </div>
            </div>

            <div className="auth-modal-head">
              <h2 id="auth-modal-title" className="auth-modal-title font-display">
                {t('loginTitle')}
              </h2>
              <p className="auth-modal-subtitle">{t('loginSubtitle')}</p>
            </div>

            <div className="auth-modal-actions">
              <button type="button" onClick={handleLogin} className="auth-modal-btn auth-modal-btn-google">
                <GoogleIcon />
                <span>{t('signInGoogle')}</span>
              </button>

              <div className="auth-modal-divider">
                <span>or</span>
              </div>

              <button type="button" onClick={handleLogin} className="auth-modal-btn auth-modal-btn-primary">
                {t('continueGuest')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
