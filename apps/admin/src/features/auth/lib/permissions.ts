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

export function isPersistedAuthUser(user: unknown): user is AuthUser {
  if (!user || typeof user !== 'object') return false;
  const candidate = user as Partial<AuthUser>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.name === 'string' &&
    Array.isArray(candidate.permissions) &&
    Array.isArray(candidate.roleIds)
  );
}
