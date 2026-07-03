import { useState } from 'react';
import type { AuthUser } from '@vokop/api';
import {
  AdminFilterPanel,
  AdminPageHeader,
  AdminPageShell,
  AdminTablePanel,
  StatusPill,
  useClientTable,
  type AdminFilterField,
  type AdminTableColumn,
} from '@/components/platform';
import { useAdminUsers } from '@/features/auth/hooks/useAuthQueries';

const filterFields: AdminFilterField[] = [
  { key: 'name', label: 'Name', placeholder: 'Search by name' },
  { key: 'email', label: 'Email', placeholder: 'Search by email' },
  {
    key: 'kind',
    label: 'Kind',
    type: 'select',
    options: [
      { value: '', label: 'All kinds' },
      { value: 'admin', label: 'Admin' },
      { value: 'user', label: 'User' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All statuses' },
      { value: 'active', label: 'Active' },
      { value: 'disabled', label: 'Disabled' },
      { value: 'pending', label: 'Pending' },
    ],
  },
];

const columns: AdminTableColumn<AuthUser>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (user) => <span className="font-semibold text-[var(--text)]">{user.name}</span>,
  },
  {
    id: 'email',
    header: 'Email',
    cell: (user) => <span className="text-[var(--text-mid)]">{user.email}</span>,
  },
  {
    id: 'kind',
    header: 'Kind',
    cell: (user) => <StatusPill value={user.kind} />,
  },
  {
    id: 'status',
    header: 'Status',
    cell: (user) => <StatusPill value={user.status} />,
  },
  {
    id: 'permissions',
    header: 'Permissions',
    cell: (user) => (
      <span className="text-[var(--text-dim)] font-medium">
        {user.permissions.length > 0 ? user.permissions.join(', ') : '—'}
      </span>
    ),
  },
];

function filterUser(user: AuthUser, filters: Record<string, string>): boolean {
  if (filters.name && !user.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
  if (filters.email && !user.email.toLowerCase().includes(filters.email.toLowerCase())) return false;
  if (filters.kind && user.kind !== filters.kind) return false;
  if (filters.status && user.status !== filters.status) return false;
  return true;
}

function exportUsersCsv(users: AuthUser[]) {
  const headers = 'Name,Email,Kind,Status,Permissions';
  const rows = users.map((user) =>
    `"${user.name}","${user.email}","${user.kind}","${user.status}","${user.permissions.join('; ')}"`,
  );
  const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'users_export.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function UsersPage() {
  const { data, isPending, refetch } = useAdminUsers();
  const users = data?.users ?? [];
  const [isFullscreen, setIsFullscreen] = useState(false);

  const table = useClientTable({
    rows: users,
    getRowId: (user) => user.id,
    filterFn: filterUser,
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
            title="Users"
            description="Platform accounts and role assignments."
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
          title="User list"
          columns={columns}
          rows={table.paginatedRows}
          rowKey={(user) => user.id}
          totalCount={table.totalCount}
          isLoading={isPending}
          emptyMessage="No users match your filters."
          selectable
          selectedIds={table.selectedIds}
          onToggleRow={table.toggleRow}
          onToggleAll={table.toggleAll}
          onRefresh={() => void refetch()}
          showFilters={table.showFilters}
          onToggleFilters={() => table.setShowFilters(!table.showFilters)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          onExport={() => exportUsersCsv(table.filteredRows)}
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
