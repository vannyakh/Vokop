import { Loader2 } from 'lucide-react';
import type { AdminMenu } from '@vokop/api';
import { useAdminMenus } from '@/features/auth/hooks/useAuthQueries';

export function MenusPage() {
  const { data, isPending } = useAdminMenus();

  return (
    <div className="admin-page space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-[var(--text)]">Admin menus</h2>
        <p className="mt-1 text-sm text-[var(--text-mid)]">Sidebar rows filtered by RBAC permissions.</p>
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
                <th>Label</th>
                <th>Path</th>
                <th>Icon</th>
                <th>Permission</th>
                <th>Order</th>
              </tr>
            </thead>
            <tbody>
              {(data?.menus ?? []).map((row: AdminMenu) => (
                <tr key={row.id}>
                  <td>{row.label}</td>
                  <td>{row.path}</td>
                  <td>{row.icon ?? '—'}</td>
                  <td className="text-[var(--text-mid)]">{row.permission ?? '—'}</td>
                  <td>{row.order}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
