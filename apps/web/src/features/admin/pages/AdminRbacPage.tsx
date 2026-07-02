import { Loader2 } from 'lucide-react';
import { useAdminPermissions, useAdminRoles } from '@/features/auth/hooks/useAuthQueries';

export function AdminRbacPage() {
  const rolesQuery = useAdminRoles();
  const permsQuery = useAdminPermissions();

  const loading = rolesQuery.isPending || permsQuery.isPending;

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h2 className="admin-page-title">Roles & RBAC</h2>
        <p className="admin-page-lead">Permission catalog and role definitions.</p>
      </header>

      {loading ? (
        <div className="admin-loading">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <div className="admin-split">
          <section className="admin-panel">
            <h3 className="admin-panel-title">Roles</h3>
            <ul className="admin-list">
              {(rolesQuery.data?.roles ?? []).map((role) => (
                <li key={role.id} className="admin-list-item">
                  <div>
                    <strong>{role.label}</strong>
                    <span className="admin-list-meta">{role.slug}</span>
                  </div>
                  <p className="admin-list-desc">{role.permissions.join(', ') || 'No permissions'}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-panel">
            <h3 className="admin-panel-title">Permissions</h3>
            <ul className="admin-list">
              {(permsQuery.data?.permissions ?? []).map((perm) => (
                <li key={perm.slug} className="admin-list-item">
                  <div>
                    <strong>{perm.label}</strong>
                    <span className="admin-list-meta">{perm.slug}</span>
                  </div>
                  {perm.description && <p className="admin-list-desc">{perm.description}</p>}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
