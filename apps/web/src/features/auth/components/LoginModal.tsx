import { useEffect, useState } from 'react';
import { ChevronLeft, Loader2, MonitorPlay, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '@/features/auth';
import { useTranslation } from '@/features/settings';
import { api } from '@/lib/api';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type AuthStep = 'email' | 'login' | 'register';

function nameFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim() ?? 'User';
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'User';
}

export function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const setSession = useAuthStore((s) => s.setSession);
  const { t } = useTranslation();

  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setStep('email');
    setEmail('');
    setName('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  const finish = (session: Awaited<ReturnType<typeof api.login>>) => {
    setSession(session);
    onSuccess?.();
    onClose();
    resetForm();
  };

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    try {
      const { exists } = await api.lookupEmail(trimmed);
      setEmail(trimmed);
      setPassword('');
      setConfirmPassword('');
      if (!exists) setName(nameFromEmail(trimmed));
      setStep(exists ? 'login' : 'register');
    } catch {
      setError('Could not verify email. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      finish(await api.login(email, password));
    } catch {
      setError('Invalid password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter your name');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      finish(await api.register(email, password, trimmedName));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setStep('email');
    setName('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const title =
    step === 'email'
      ? t('loginTitle')
      : step === 'login'
        ? 'Welcome back'
        : 'Create your account';

  const subtitle =
    step === 'email'
      ? t('loginSubtitle')
      : step === 'login'
        ? email
        : email;

  return (
    <AnimatePresence>
      {open && (
        <div className="auth-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-5 sm:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="auth-modal-backdrop absolute inset-0"
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="auth-modal-panel relative w-full max-w-[480px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
          >
            {step !== 'email' && (
              <button
                type="button"
                onClick={goBack}
                className="auth-modal-back"
                aria-label="Back"
              >
                <ChevronLeft size={18} />
              </button>
            )}

            <button type="button" onClick={onClose} className="auth-modal-close" aria-label="Close">
              <X size={22} strokeWidth={2} />
            </button>

            <div className="auth-modal-brand">
              <div className="auth-modal-logo">
                <MonitorPlay size={28} strokeWidth={2} />
              </div>
            </div>

            <div className="auth-modal-head">
              <h2 id="auth-modal-title" className="auth-modal-title font-display">
                {title}
              </h2>
              <p className="auth-modal-subtitle">{subtitle}</p>
            </div>

            {step === 'email' && (
              <form className="auth-modal-actions" onSubmit={handleEmailContinue}>
                <input
                  type="email"
                  className="auth-modal-input"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                />
                {error && <p className="auth-modal-error">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="auth-modal-btn auth-modal-btn-primary"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Continue'}
                </button>
              </form>
            )}

            {step === 'login' && (
              <form className="auth-modal-actions" onSubmit={handleLogin}>
                <input
                  type="password"
                  className="auth-modal-input"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                  required
                />
                {error && <p className="auth-modal-error">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !password}
                  className="auth-modal-btn auth-modal-btn-primary"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign in'}
                </button>
              </form>
            )}

            {step === 'register' && (
              <form className="auth-modal-actions" onSubmit={handleRegister}>
                <input
                  type="text"
                  className="auth-modal-input"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={120}
                  autoFocus
                  required
                />
                <input
                  type="password"
                  className="auth-modal-input"
                  placeholder="Create password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <input
                  type="password"
                  className="auth-modal-input"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                {error && <p className="auth-modal-error">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !name.trim() || !password || !confirmPassword}
                  className="auth-modal-btn auth-modal-btn-primary"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create account'}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
