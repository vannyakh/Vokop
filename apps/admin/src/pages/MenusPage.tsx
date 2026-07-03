import { useMemo, useState } from 'react';
import type { AdminMenuTreeItem } from '@vokop/api';
import {
  AdminFilterPanel,
  AdminPageHeader,
  AdminPageShell,
  AdminTablePanel,
  ModulePill,
  useClientTable,
  type AdminFilterField,
  type AdminTableColumn,
} from '@/components/platform';
import { useAdminMenus } from '@/features/auth/hooks/useAuthQueries';

interface FlatMenuRow {
  id: string;
  label: string;
  path: string;
  icon: string;
  permission: string;
  order: number;
  depth: number;
}

const filterFields: AdminFilterField[] = [
  { key: 'label', label: 'Label', placeholder: 'Search by label' },
  { key: 'path', label: 'Path', placeholder: 'Search by path' },
  {
    key: 'permission',
    label: 'Permission',
    placeholder: 'e.g. users.read',
    colSpan: 2,
  },
];

const columns: AdminTableColumn<FlatMenuRow>[] = [
  {
    id: 'label',
    header: 'Label',
    cell: (row) => (
      <span className="font-semibold text-[var(--text)]" style={{ paddingLeft: `${row.depth * 12}px` }}>
        {row.label}
      </span>
    ),
  },
  {
    id: 'path',
    header: 'Path',
    cell: (row) => <span className="font-mono text-[var(--text-dim)]">{row.path}</span>,
  },
  {
    id: 'icon',
    header: 'Icon',
    cell: (row) => <span className="text-[var(--text-mid)]">{row.icon || '—'}</span>,
  },
  {
    id: 'permission',
    header: 'Permission',
    cell: (row) =>
      row.permission ? <ModulePill value={row.permission} /> : <span className="text-[var(--text-dim)]">—</span>,
  },
  {
    id: 'order',
    header: 'Order',
    cell: (row) => <span className="text-[var(--text-dim)]">{row.order}</span>,
  },
];

function flattenMenus(menus: AdminMenuTreeItem[], depth = 0): FlatMenuRow[] {
  return menus.flatMap((menu) => [
    {
      id: menu.id,
      label: menu.label,
      path: menu.path,
      icon: menu.icon ?? '',
      permission: menu.permission ?? '',
      order: menu.order,
      depth,
    },
    ...flattenMenus(menu.children ?? [], depth + 1),
  ]);
}

function filterMenu(row: FlatMenuRow, filters: Record<string, string>): boolean {
  if (filters.label && !row.label.toLowerCase().includes(filters.label.toLowerCase())) return false;
  if (filters.path && !row.path.toLowerCase().includes(filters.path.toLowerCase())) return false;
  if (filters.permission && !row.permission.toLowerCase().includes(filters.permission.toLowerCase())) {
    return false;
  }
  return true;
}

export function MenusPage() {
  const { data, isPending, refetch } = useAdminMenus();
  const flatMenus = useMemo(() => flattenMenus(data?.menus ?? []), [data?.menus]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const table = useClientTable({
    rows: flatMenus,
    getRowId: (row) => row.id,
    filterFn: filterMenu,
  });

  return (
    <AdminPageShell>
      <div
        className={`space-y-4 flex flex-col h-full min-h-0 transition-all duration-200 ${
          isFullscreen ? 'fixed inset-0 z-[250] m-0 rounded-none p-6 bg-[var(--bg)]' : ''
        }`}
      >
        {!isFullscreen ? (
          <AdminPageHeader
            title="Admin menus"
            description="Sidebar rows filtered by RBAC permissions."
          />
        ) : null}

        {table.showFilters ? (
          <AdminFilterPanel
            fields={filterFields}
            values={table.filters}
            onChange={table.setFilter}
            onReset={table.resetFilters}
          />
        ) : null}

        <AdminTablePanel
          title="Menu list"
          columns={columns}
          rows={table.paginatedRows}
          rowKey={(row) => row.id}
          totalCount={table.totalCount}
          isLoading={isPending}
          emptyMessage="No menu items match your filters."
          onRefresh={() => void refetch()}
          showFilters={table.showFilters}
          onToggleFilters={() => table.setShowFilters(!table.showFilters)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          pageSize={table.pageSize}
          onPageSizeChange={table.setPageSize}
          currentPage={table.currentPage}
          onPageChange={table.setCurrentPage}
          totalPages={table.totalPages}
          startIndex={table.startIndex}
        />
      </div>
    </AdminPageShell>
  );
}
