import { useEffect, useState } from 'react';
import { ChevronLeft, Loader2, MonitorPlay, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore, userHasPermission } from '@/features/auth';
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
    if (!userHasPermission(session.user, 'admin.access')) {
      setError('This account does not have admin access.');
      return;
    }

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
    step === 'email' ? 'Admin sign in' : step === 'login' ? 'Welcome back' : 'Create admin account';

  const subtitle =
    step === 'email'
      ? 'Use your Vokop account with admin access.'
      : step === 'login'
        ? email
        : email;

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="admin-login-overlay fixed inset-0 z-[100] flex items-center justify-center p-5">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/55 backdrop-blur-md"
          aria-hidden="true"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          className="admin-login-panel relative w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--panel-solid)] p-8 shadow-2xl"
          role="dialog"
          aria-modal="true"
        >
          {step !== 'email' && (
            <button type="button" onClick={goBack} className="admin-login-icon-btn absolute left-4 top-4">
              <ChevronLeft size={18} />
            </button>
          )}
          <button type="button" onClick={onClose} className="admin-login-icon-btn absolute right-4 top-4">
            <X size={18} />
          </button>

          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--indigo)] text-white">
            <MonitorPlay size={24} />
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-[var(--text)]">{title}</h1>
            <p className="mt-2 text-sm text-[var(--text-mid)]">{subtitle}</p>
          </div>

          {step === 'email' && (
            <form className="space-y-3" onSubmit={handleEmailContinue}>
              <input
                type="email"
                className="admin-login-input"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
              />
              {error && <p className="admin-login-error">{error}</p>}
              <button type="submit" disabled={loading || !email.trim()} className="admin-login-btn">
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Continue'}
              </button>
            </form>
          )}

          {step === 'login' && (
            <form className="space-y-3" onSubmit={handleLogin}>
              <input
                type="password"
                className="admin-login-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                required
              />
              {error && <p className="admin-login-error">{error}</p>}
              <button type="submit" disabled={loading || !password} className="admin-login-btn">
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign in'}
              </button>
            </form>
          )}

          {step === 'register' && (
            <form className="space-y-3" onSubmit={handleRegister}>
              <input
                type="text"
                className="admin-login-input"
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
                className="admin-login-input"
                placeholder="Create password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <input
                type="password"
                className="admin-login-input"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              {error && <p className="admin-login-error">{error}</p>}
              <button
                type="submit"
                disabled={loading || !name.trim() || !password || !confirmPassword}
                className="admin-login-btn"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create account'}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
