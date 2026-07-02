import type { AuthUser } from '@vokop/api';
import type { PermissionSlug } from '@vokop/shared';

export function userPermissions(user: AuthUser | null | undefined): PermissionSlug[] {
  return user?.permissions ?? [];
}

export function userHasPermission(
  user: AuthUser | null | undefined,
  permission: PermissionSlug,
): boolean {
  return userPermissions(user).includes(permission);
}

export function isPersistedAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false;
  const user = value as Partial<AuthUser>;
  return (
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.name === 'string' &&
    Array.isArray(user.roleIds) &&
    Array.isArray(user.permissions)
  );
}
