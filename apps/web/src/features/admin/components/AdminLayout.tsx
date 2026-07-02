import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAdminMenus } from '@/features/auth/hooks/useAuthQueries';
import { ROUTES } from '@/routes/paths';

const ICONS: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard,
  Users: LayoutDashboard,
  Shield: LayoutDashboard,
  Menu: LayoutDashboard,
};

export function AdminLayout() {
  const { data, isPending } = useAdminMenus();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-head">
          <h1 className="admin-sidebar-title">Admin</h1>
          <p className="admin-sidebar-sub">RBAC & platform settings</p>
        </div>

        {isPending ? (
          <div className="admin-sidebar-loading">
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : (
          <nav className="admin-nav">
            {(data?.menus ?? []).map((item) => {
              const Icon = ICONS[item.icon ?? 'LayoutDashboard'] ?? LayoutDashboard;
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end={item.path === ROUTES.admin}
                  className={({ isActive }) => cn('admin-nav-link', isActive && 'active')}
                >
                  <Icon size={14} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        )}
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
