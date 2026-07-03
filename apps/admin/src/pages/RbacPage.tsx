import { useMemo, useState } from 'react';
import type { Role } from '@vokop/api';
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
import { useAdminPermissions, useAdminRoles } from '@/features/auth/hooks/useAuthQueries';

interface PermissionRow {
  slug: string;
  label: string;
  group: string;
  description: string;
}

const roleFilterFields: AdminFilterField[] = [
  { key: 'label', label: 'Role name', placeholder: 'Search by label' },
  { key: 'slug', label: 'Slug', placeholder: 'Search by slug' },
];

const permissionFilterFields: AdminFilterField[] = [
  { key: 'label', label: 'Permission', placeholder: 'Search by label' },
  { key: 'slug', label: 'Slug', placeholder: 'Search by slug' },
  {
    key: 'group',
    label: 'Group',
    type: 'select',
    options: [
      { value: '', label: 'All groups' },
      { value: 'admin', label: 'Admin' },
      { value: 'users', label: 'Users' },
      { value: 'roles', label: 'Roles' },
      { value: 'menus', label: 'Menus' },
    ],
  },
];

const roleColumns: AdminTableColumn<Role>[] = [
  {
    id: 'label',
    header: 'Role',
    cell: (role) => <span className="font-semibold text-[var(--text)]">{role.label}</span>,
  },
  {
    id: 'slug',
    header: 'Slug',
    cell: (role) => <span className="font-mono text-[var(--text-dim)]">{role.slug}</span>,
  },
  {
    id: 'permissions',
    header: 'Permissions',
    cell: (role) => (
      <span className="text-[var(--text-dim)] font-medium">
        {role.permissions.length > 0 ? role.permissions.join(', ') : '—'}
      </span>
    ),
  },
  {
    id: 'system',
    header: 'System',
    cell: (role) => (role.isSystem ? <ModulePill value="system" /> : <span className="text-[var(--text-dim)]">—</span>),
  },
];

const permissionColumns: AdminTableColumn<PermissionRow>[] = [
  {
    id: 'label',
    header: 'Permission',
    cell: (perm) => <span className="font-semibold text-[var(--text)]">{perm.label}</span>,
  },
  {
    id: 'slug',
    header: 'Slug',
    cell: (perm) => <span className="font-mono text-[var(--text-dim)]">{perm.slug}</span>,
  },
  {
    id: 'group',
    header: 'Group',
    cell: (perm) => <ModulePill value={perm.group} />,
  },
  {
    id: 'description',
    header: 'Description',
    cell: (perm) => <span className="text-[var(--text-dim)]">{perm.description || '—'}</span>,
  },
];

function filterRole(role: Role, filters: Record<string, string>): boolean {
  if (filters.label && !role.label.toLowerCase().includes(filters.label.toLowerCase())) return false;
  if (filters.slug && !role.slug.toLowerCase().includes(filters.slug.toLowerCase())) return false;
  return true;
}

function filterPermission(perm: PermissionRow, filters: Record<string, string>): boolean {
  if (filters.label && !perm.label.toLowerCase().includes(filters.label.toLowerCase())) return false;
  if (filters.slug && !perm.slug.toLowerCase().includes(filters.slug.toLowerCase())) return false;
  if (filters.group && perm.group !== filters.group) return false;
  return true;
}

export function RbacPage() {
  const rolesQuery = useAdminRoles();
  const permissionsQuery = useAdminPermissions();
  const [showRoleFilters, setShowRoleFilters] = useState(true);
  const [showPermissionFilters, setShowPermissionFilters] = useState(true);

  const roles = rolesQuery.data?.roles ?? [];
  const permissions = useMemo<PermissionRow[]>(
    () =>
      (permissionsQuery.data?.permissions ?? []).map((perm) => ({
        slug: perm.slug,
        label: perm.label,
        group: perm.group,
        description: perm.description ?? '',
      })),
    [permissionsQuery.data?.permissions],
  );

  const rolesTable = useClientTable({ rows: roles, getRowId: (role) => role.id, filterFn: filterRole });
  const permissionsTable = useClientTable({
    rows: permissions,
    getRowId: (perm) => perm.slug,
    filterFn: filterPermission,
    initialPageSize: 10,
  });

  const isPending = rolesQuery.isPending || permissionsQuery.isPending;

  return (
    <AdminPageShell>
      <div className="space-y-4 flex flex-col h-full min-h-0">
        <AdminPageHeader
          title="Roles & RBAC"
          description="Permission catalog and role definitions."
        />

        {showRoleFilters ? (
          <AdminFilterPanel
            fields={roleFilterFields}
            values={rolesTable.filters}
            onChange={rolesTable.setFilter}
            onReset={rolesTable.resetFilters}
          />
        ) : null}

        <AdminTablePanel
          title="Role list"
          columns={roleColumns}
          rows={rolesTable.paginatedRows}
          rowKey={(role) => role.id}
          totalCount={rolesTable.totalCount}
          isLoading={isPending}
          emptyMessage="No roles match your filters."
          onRefresh={() => void rolesQuery.refetch()}
          showFilters={showRoleFilters}
          onToggleFilters={() => setShowRoleFilters(!showRoleFilters)}
          pageSize={rolesTable.pageSize}
          onPageSizeChange={rolesTable.setPageSize}
          currentPage={rolesTable.currentPage}
          onPageChange={rolesTable.setCurrentPage}
          totalPages={rolesTable.totalPages}
          startIndex={rolesTable.startIndex}
        />

        {showPermissionFilters ? (
          <AdminFilterPanel
            fields={permissionFilterFields}
            values={permissionsTable.filters}
            onChange={permissionsTable.setFilter}
            onReset={permissionsTable.resetFilters}
          />
        ) : null}

        <AdminTablePanel
          title="Permission catalog"
          columns={permissionColumns}
          rows={permissionsTable.paginatedRows}
          rowKey={(perm) => perm.slug}
          totalCount={permissionsTable.totalCount}
          isLoading={isPending}
          emptyMessage="No permissions match your filters."
          onRefresh={() => void permissionsQuery.refetch()}
          showFilters={showPermissionFilters}
          onToggleFilters={() => setShowPermissionFilters(!showPermissionFilters)}
          pageSize={permissionsTable.pageSize}
          onPageSizeChange={permissionsTable.setPageSize}
          currentPage={permissionsTable.currentPage}
          onPageChange={permissionsTable.setCurrentPage}
          totalPages={permissionsTable.totalPages}
          startIndex={permissionsTable.startIndex}
        />
      </div>
    </AdminPageShell>
  );
}
