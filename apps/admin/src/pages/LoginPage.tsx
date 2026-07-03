import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginModal } from '@/features/auth/components/LoginModal';
import { ADMIN_ROUTES } from '@vokop/shared';

export function LoginPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
      <LoginModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => navigate(ADMIN_ROUTES.home, { replace: true })}
      />
    </div>
  );
}
