import { Loader2 } from 'lucide-react';
import { useAdminPermissions, useAdminRoles } from '@/features/auth/hooks/useAuthQueries';

export function RbacPage() {
  const rolesQuery = useAdminRoles();
  const permissionsQuery = useAdminPermissions();
  const isPending = rolesQuery.isPending || permissionsQuery.isPending;

  return (
    <div className="admin-page space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-[var(--text)]">Roles & RBAC</h2>
        <p className="mt-1 text-sm text-[var(--text-mid)]">Permission catalog and role definitions.</p>
      </header>

      {isPending ? (
        <div className="admin-loading">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
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
              {(permissionsQuery.data?.permissions ?? []).map((perm) => (
                <li key={perm.slug} className="admin-list-item">
                  <div>
                    <strong>{perm.label}</strong>
                    <span className="admin-list-meta">{perm.slug}</span>
                  </div>
                  {'description' in perm && perm.description ? (
                    <p className="admin-list-desc">{String(perm.description)}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
