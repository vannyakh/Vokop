import { useNavigate } from 'react-router-dom';
import { LoginModal } from '@/features/auth/components/LoginModal';
import { ADMIN_ROUTES } from '@vokop/shared';

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <LoginModal
      variant="page"
      onSuccess={() => navigate(ADMIN_ROUTES.home, { replace: true })}
    />
  );
}
