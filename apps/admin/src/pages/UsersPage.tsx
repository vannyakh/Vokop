import { Loader2 } from 'lucide-react';
import { useAdminUsers } from '@/features/auth/hooks/useAuthQueries';

export function UsersPage() {
  const { data, isPending } = useAdminUsers();

  return (
    <div className="admin-page space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-[var(--text)]">Users</h2>
        <p className="mt-1 text-sm text-[var(--text-mid)]">Platform accounts and role assignments.</p>
      </header>

      {isPending ? (
        <div className="admin-loading">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <div className="admin-table-wrap overflow-hidden rounded-2xl border border-[var(--border)]">
          <table className="admin-table w-full text-sm">
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
                  <td className="text-[var(--text-mid)]">{user.permissions.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
