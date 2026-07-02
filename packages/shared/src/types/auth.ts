/** Permission slugs used across RBAC checks. */
export type PermissionSlug =
  | 'admin.access'
  | 'users.read'
  | 'users.write'
  | 'roles.read'
  | 'roles.write'
  | 'menus.read'
  | 'menus.write';

export type UserKind = 'user' | 'admin' | 'guest';

export type UserStatus = 'active' | 'disabled' | 'pending';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  kind: UserKind;
  status: UserStatus;
  roleIds: string[];
  permissions: PermissionSlug[];
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RoleDefinition {
  id: string;
  slug: string;
  label: string;
  description?: string;
  permissions: PermissionSlug[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionDefinition {
  slug: PermissionSlug;
  label: string;
  description?: string;
  group: 'admin' | 'users' | 'roles' | 'menus';
}

export interface AdminMenuItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  parentId: string | null;
  order: number;
  permission: PermissionSlug | null;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMenuTreeItem extends AdminMenuItem {
  children: AdminMenuTreeItem[];
}
