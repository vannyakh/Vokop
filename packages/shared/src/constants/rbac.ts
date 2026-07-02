import type { AdminMenuItem, PermissionDefinition, PermissionSlug } from '../types/auth.js';

export const PERMISSIONS: PermissionDefinition[] = [
  { slug: 'admin.access', label: 'Admin access', group: 'admin', description: 'Enter the admin area' },
  { slug: 'users.read', label: 'View users', group: 'users' },
  { slug: 'users.write', label: 'Manage users', group: 'users' },
  { slug: 'roles.read', label: 'View roles', group: 'roles' },
  { slug: 'roles.write', label: 'Manage roles', group: 'roles' },
  { slug: 'menus.read', label: 'View admin menus', group: 'menus' },
  { slug: 'menus.write', label: 'Manage admin menus', group: 'menus' },
];

export const ALL_PERMISSIONS: PermissionSlug[] = PERMISSIONS.map((p) => p.slug);

export const DEFAULT_ROLE_SEEDS = [
  {
    slug: 'user',
    label: 'User',
    description: 'Standard studio user',
    permissions: [] as PermissionSlug[],
    isSystem: true,
  },
  {
    slug: 'admin',
    label: 'Admin',
    description: 'Manage users, roles, and menus',
    permissions: [
      'admin.access',
      'users.read',
      'users.write',
      'roles.read',
      'roles.write',
      'menus.read',
      'menus.write',
    ] as PermissionSlug[],
    isSystem: true,
  },
  {
    slug: 'super_admin',
    label: 'Super admin',
    description: 'Full platform access',
    permissions: ALL_PERMISSIONS,
    isSystem: true,
  },
] as const;

export const DEFAULT_ADMIN_MENU_SEEDS: Omit<
  AdminMenuItem,
  'id' | 'createdAt' | 'updatedAt'
>[] = [
  {
    label: 'Dashboard',
    path: '/admin',
    icon: 'LayoutDashboard',
    parentId: null,
    order: 0,
    permission: 'admin.access',
    visible: true,
  },
  {
    label: 'Users',
    path: '/admin/users',
    icon: 'Users',
    parentId: null,
    order: 10,
    permission: 'users.read',
    visible: true,
  },
  {
    label: 'RBAC',
    path: '/admin/rbac',
    icon: 'Shield',
    parentId: null,
    order: 20,
    permission: 'roles.read',
    visible: true,
  },
  {
    label: 'Admin menus',
    path: '/admin/menus',
    icon: 'Menu',
    parentId: null,
    order: 30,
    permission: 'menus.read',
    visible: true,
  },
];
