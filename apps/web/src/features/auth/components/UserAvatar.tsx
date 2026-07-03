import { useState, useRef, useEffect } from 'react';
import { useAuthStore, userHasPermission } from '@/features/auth';
import { useTranslation } from '@/features/settings';
import { LogOut, User, Shield } from 'lucide-react';
import { getAdminAppUrl } from '@/lib/adminUrl';
import { api } from '@/lib/api';

interface UserAvatarProps {
  onLoginClick: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function UserAvatar({ onLoginClick }: UserAvatarProps) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const { t } = useTranslation();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!isLoggedIn) {
    return (
      <button
        type="button"
        onClick={onLoginClick}
        title={t('login')}
        className="float-icon-btn rounded-full border border-[color:var(--border)]"
      >
        <User size={16} />
      </button>
    );
  }

  const initials = user?.name ? getInitials(user.name) : 'U';

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        title={user?.name ?? 'Account'}
        className="studio-brand-logo w-10 h-10 text-xs font-bold transition-opacity hover:opacity-90 active:opacity-80 rounded-full border border-[color:var(--border)]"
      >
        {initials}
      </button>

      {menuOpen && (
        <div className="vokop-dropdown absolute top-full right-0 mt-2 min-w-[180px] py-1 rounded-2xl z-50 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-[color:var(--border)]">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>
              {user?.name}
            </p>
            <p className="text-[10px] text-faint truncate font-mono">{user?.email}</p>
          </div>
          {userHasPermission(user, 'admin.access') && (
            <a
              href={getAdminAppUrl()}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-[color:var(--surface-hi)]"
            >
              <Shield size={13} />
              Admin
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              if (refreshToken) void api.logout(refreshToken);
              logout();
              setMenuOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors text-[#e8746a] hover:bg-[rgba(232,116,106,0.1)]"
          >
            <LogOut size={13} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
