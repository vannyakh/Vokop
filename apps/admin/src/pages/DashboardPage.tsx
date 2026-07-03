import { Link } from 'react-router-dom';
import { ArrowRight, KeyRound, LayoutList, Shield, Users } from 'lucide-react';
import { ADMIN_ROUTES } from '@vokop/shared';
import {
  AdminMetricCard,
  AdminPageHeader,
  AdminPageShell,
} from '@/components/platform';
import {
  useAdminMenus,
  useAdminPermissions,
  useAdminRoles,
  useAdminUsers,
} from '@/features/auth/hooks/useAuthQueries';

const quickLinks = [
  {
    to: ADMIN_ROUTES.users,
    title: 'Users',
    description: 'Accounts and role assignments.',
    icon: Users,
  },
  {
    to: ADMIN_ROUTES.rbac,
    title: 'Roles & RBAC',
    description: 'Permission catalog and role definitions.',
    icon: Shield,
  },
  {
    to: ADMIN_ROUTES.menus,
    title: 'Admin menus',
    description: 'Sidebar rows filtered by RBAC permissions.',
    icon: LayoutList,
  },
  {
    to: ADMIN_ROUTES.activity,
    title: 'Activity log',
    description: 'Audit trail for platform actions.',
    icon: KeyRound,
  },
] as const;

export function DashboardPage() {
  const usersQuery = useAdminUsers();
  const rolesQuery = useAdminRoles();
  const permissionsQuery = useAdminPermissions();
  const menusQuery = useAdminMenus();

  const metrics = [
    {
      title: 'Users',
      value: usersQuery.data ? String(usersQuery.data.users.length) : '—',
      hint: usersQuery.data ? 'Platform accounts' : 'Loading or unavailable',
      icon: <Users className="w-5 h-5 text-[var(--indigo)]" />,
    },
    {
      title: 'Roles',
      value: rolesQuery.data ? String(rolesQuery.data.roles.length) : '—',
      hint: rolesQuery.data ? 'RBAC role definitions' : 'Loading or unavailable',
      icon: <Shield className="w-5 h-5 text-indigo-400" />,
    },
    {
      title: 'Permissions',
      value: permissionsQuery.data ? String(permissionsQuery.data.permissions.length) : '—',
      hint: permissionsQuery.data ? 'Catalog entries' : 'Loading or unavailable',
      icon: <KeyRound className="w-5 h-5 text-green-400" />,
    },
    {
      title: 'Menu items',
      value: menusQuery.data ? String(countMenuItems(menusQuery.data.menus)) : '—',
      hint: menusQuery.data ? 'Admin navigation rows' : 'Loading or unavailable',
      icon: <LayoutList className="w-5 h-5 text-blue-400" />,
    },
  ];

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Platform dashboard"
        description="Manage users, roles, permissions, and admin navigation for Vokop."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <AdminMetricCard key={metric.title} {...metric} />
        ))}
      </div>

      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[var(--text)]">Quick navigation</h3>
          <span className="text-[11px] text-[var(--text-dim)] font-semibold">{quickLinks.length} sections</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/2 hover:bg-white/4 transition-colors duration-150"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-white/4 border border-white/5 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[var(--indigo)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[var(--text)]">{link.title}</div>
                    <div className="text-[11px] text-[var(--text-dim)] mt-0.5">{link.description}</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-dim)] flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>
    </AdminPageShell>
  );
}

function countMenuItems(
  menus: Array<{ children?: Array<unknown> }>,
): number {
  return menus.reduce((sum, menu) => sum + 1 + countMenuItems((menu.children ?? []) as Array<{ children?: Array<unknown> }>), 0);
}
