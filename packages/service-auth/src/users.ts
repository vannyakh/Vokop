import { ObjectId } from 'mongodb';
import { getMongo } from '@vokop/db';
import type { PermissionSlug } from '@vokop/shared';
import type { RoleDoc, UserDoc } from './types.js';

export const USERS = 'users';
export const ROLES = 'roles';

export function usersCol() {
  return getMongo().collection<UserDoc>(USERS);
}

export function rolesCol() {
  return getMongo().collection<RoleDoc>(ROLES);
}

export async function findUserById(id: string): Promise<UserDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  return usersCol().findOne({ _id: new ObjectId(id) });
}

export async function resolvePermissions(roleIds: ObjectId[]): Promise<PermissionSlug[]> {
  if (!roleIds.length) return [];
  const roles = await rolesCol()
    .find({ _id: { $in: roleIds } })
    .toArray();
  const set = new Set<PermissionSlug>();
  for (const role of roles) {
    for (const perm of role.permissions) set.add(perm);
  }
  return [...set];
}
