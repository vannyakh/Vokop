import { Loader2 } from 'lucide-react';
import { useAdminUsers } from '@/features/auth/hooks/useAuthQueries';

export function AdminUsersPage() {
  const { data, isPending } = useAdminUsers();

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h2 className="admin-page-title">Users</h2>
        <p className="admin-page-lead">Platform accounts and role assignments.</p>
      </header>

      {isPending ? (
        <div className="admin-loading">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Kind</th>
                <th>Status</th>
                <th>Permissions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.users ?? []).map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.kind}</td>
                  <td>{user.status}</td>
                  <td className="admin-table-muted">{user.permissions.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
