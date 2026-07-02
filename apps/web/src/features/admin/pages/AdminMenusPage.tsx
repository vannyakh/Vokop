import { Loader2 } from 'lucide-react';
import { useAdminMenus } from '@/features/auth/hooks/useAuthQueries';

function flattenMenus(
  items: Array<{ id: string; label: string; path: string; permission: string | null; order: number; children?: unknown[] }>,
  depth = 0,
): Array<{ id: string; label: string; path: string; permission: string | null; order: number; depth: number }> {
  const rows: Array<{ id: string; label: string; path: string; permission: string | null; order: number; depth: number }> = [];
  for (const item of items) {
    rows.push({ id: item.id, label: item.label, path: item.path, permission: item.permission, order: item.order, depth });
    if (item.children?.length) {
      rows.push(...flattenMenus(item.children as typeof items, depth + 1));
    }
  }
  return rows;
}

export function AdminMenusPage() {
  const { data, isPending } = useAdminMenus();
  const rows = flattenMenus((data?.menus ?? []) as Parameters<typeof flattenMenus>[0]);

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h2 className="admin-page-title">Admin menus</h2>
        <p className="admin-page-lead">Sidebar rows filtered by RBAC permissions.</p>
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
                <th>Label</th>
                <th>Path</th>
                <th>Permission</th>
                <th>Order</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={{ paddingLeft: `${8 + row.depth * 16}px` }}>{row.label}</td>
                  <td>{row.path}</td>
                  <td className="admin-table-muted">{row.permission ?? '—'}</td>
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
