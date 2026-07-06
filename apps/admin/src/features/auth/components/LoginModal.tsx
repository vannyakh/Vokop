import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { VokopLogo } from '@/components/brand/VokopLogo';
import { useAuthStore, userHasPermission } from '@/features/auth';
import { api } from '@/lib/api';
import {
  AdminAuthHeader,
  AdminAuthShell,
  type AdminAuthVariant,
} from '@/features/auth/components/AdminAuthShell';

interface LoginModalProps {
  open?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  variant?: AdminAuthVariant;
}

type AuthStep = 'email' | 'login' | 'register';

function nameFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim() ?? 'User';
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'User';
}

export function LoginModal({
  open = true,
  onClose,
  onSuccess,
  variant = 'modal',
}: LoginModalProps) {
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
    if (variant === 'modal') {
      document.body.style.overflow = open ? 'hidden' : '';
      if (!open) resetForm();
      return () => {
        document.body.style.overflow = '';
      };
    }
    return undefined;
  }, [open, variant]);

  const finish = (session: Awaited<ReturnType<typeof api.login>>) => {
    if (!userHasPermission(session.user, 'admin.access')) {
      setError('This account does not have admin access.');
      return;
    }

    setSession(session);
    onSuccess?.();
    onClose?.();
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
    step === 'email' ? 'Sign in' : step === 'login' ? 'Welcome back' : 'Create admin account';

  const subtitle =
    step === 'email'
      ? 'Use your Vokop account for access.'
      : step === 'login'
        ? 'Enter your password to continue.'
        : 'Set up your admin profile.';

  if (variant === 'modal' && !open) return null;

  const content = (
    <>
      <div className="admin-auth-brand">
        <VokopLogo className="h-30" alt="Vokop Admin" />
      </div>

      <AdminAuthHeader
        title={title}
        subtitle={step === 'email' ? subtitle : email}
        subtitleVariant={step === 'email' ? 'default' : 'email'}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="admin-auth-step"
        >
          {step === 'email' && (
            <form className="admin-auth-form" onSubmit={handleEmailContinue}>
              <input
                type="email"
                className="admin-auth-field"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
              />
              {error ? <p className="admin-auth-error">{error}</p> : null}
              <button type="submit" disabled={loading || !email.trim()} className="admin-auth-submit">
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Continue'}
              </button>
            </form>
          )}

          {step === 'login' && (
            <form className="admin-auth-form" onSubmit={handleLogin}>
              <input
                type="password"
                className="admin-auth-field"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                required
              />
              {error ? <p className="admin-auth-error">{error}</p> : null}
              <button type="submit" disabled={loading || !password} className="admin-auth-submit">
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign in'}
              </button>
            </form>
          )}

          {step === 'register' && (
            <form className="admin-auth-form" onSubmit={handleRegister}>
              <input
                type="text"
                className="admin-auth-field"
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
                className="admin-auth-field"
                placeholder="Create password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <input
                type="password"
                className="admin-auth-field"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              {error ? <p className="admin-auth-error">{error}</p> : null}
              <button
                type="submit"
                disabled={loading || !name.trim() || !password || !confirmPassword}
                className="admin-auth-submit"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create account'}
              </button>
            </form>
          )}
        </motion.div>
      </AnimatePresence>

    </>
  );

  if (variant === 'page') {
    return (
      <AdminAuthShell variant="page" showBack={step !== 'email'} onBack={goBack}>
        {content}
      </AdminAuthShell>
    );
  }

  return (
    <AnimatePresence>
      {open ? (
        <AdminAuthShell
          variant="modal"
          open={open}
          showBack={step !== 'email'}
          onBack={goBack}
          onClose={onClose}
        >
          {content}
        </AdminAuthShell>
      ) : null}
    </AnimatePresence>
  );
}
