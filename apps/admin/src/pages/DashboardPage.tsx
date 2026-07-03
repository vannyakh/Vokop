import { Link } from 'react-router-dom';
import { ADMIN_ROUTES } from '@vokop/shared';

export function DashboardPage() {
  return (
    <div className="admin-page space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-[var(--text)]">Platform dashboard</h2>
        <p className="mt-1 text-sm text-[var(--text-mid)]">
          Manage users, roles, permissions, and admin navigation for Vokop.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Link to={ADMIN_ROUTES.users} className="admin-card">
          <h3>Users</h3>
          <p>Accounts and role assignments.</p>
        </Link>
        <Link to={ADMIN_ROUTES.rbac} className="admin-card">
          <h3>Roles & RBAC</h3>
          <p>Permission catalog and role definitions.</p>
        </Link>
        <Link to={ADMIN_ROUTES.menus} className="admin-card">
          <h3>Admin menus</h3>
          <p>Sidebar rows filtered by RBAC permissions.</p>
        </Link>
      </div>
    </div>
  );
}
