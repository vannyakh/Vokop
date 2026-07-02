import { Link } from 'react-router-dom';
import { ROUTES } from '@/routes/paths';

export function AdminDashboardPage() {
  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h2 className="admin-page-title">Dashboard</h2>
        <p className="admin-page-lead">Manage users, roles, permissions, and admin navigation.</p>
      </header>

      <div className="admin-card-grid">
        <Link to={ROUTES.adminUsers} className="admin-card">
          <h3>Users</h3>
          <p>Assign roles and account status.</p>
        </Link>
        <Link to={ROUTES.adminRbac} className="admin-card">
          <h3>RBAC</h3>
          <p>Create roles and permission sets.</p>
        </Link>
        <Link to={ROUTES.adminMenus} className="admin-card">
          <h3>Admin menus</h3>
          <p>Configure sidebar rows and visibility.</p>
        </Link>
      </div>
    </div>
  );
}
