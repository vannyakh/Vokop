import { ObjectId } from 'mongodb';
import { getMongo } from '@vokop/db';
import type { PermissionSlug, UserKind, UserStatus } from '@vokop/shared';
import type { RoleDoc, UserDoc } from '../lib/mappers.js';

export const USERS = 'users';
export const ROLES = 'roles';

export async function ensureAuthIndexes(): Promise<void> {
  const db = getMongo();
  await db.collection(USERS).createIndex({ email: 1 }, { unique: true });
  await db.collection(ROLES).createIndex({ slug: 1 }, { unique: true });
}

export function usersCol() {
  return getMongo().collection<UserDoc>(USERS);
}

export function rolesCol() {
  return getMongo().collection<RoleDoc>(ROLES);
}

export async function findUserByEmail(email: string): Promise<UserDoc | null> {
  return usersCol().findOne({ email: email.toLowerCase() });
}

export async function findUserById(id: string): Promise<UserDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  return usersCol().findOne({ _id: new ObjectId(id) });
}

export async function listUsers(): Promise<UserDoc[]> {
  return usersCol().find().sort({ createdAt: -1 }).toArray();
}

export async function createUser(input: {
  email: string;
  name: string;
  passwordHash?: string;
  kind: UserKind;
  status: UserStatus;
  roleIds: ObjectId[];
}): Promise<UserDoc> {
  const now = new Date();
  const doc: UserDoc = {
    _id: new ObjectId(),
    email: input.email.toLowerCase(),
    name: input.name,
    passwordHash: input.passwordHash,
    kind: input.kind,
    status: input.status,
    roleIds: input.roleIds,
    createdAt: now,
    updatedAt: now,
  };
  await usersCol().insertOne(doc);
  return doc;
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<UserDoc, 'roleIds' | 'status' | 'name' | 'kind'>>,
): Promise<UserDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  const result = await usersCol().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
  return result ?? null;
}

export async function resolvePermissions(roleIds: import('mongodb').ObjectId[]): Promise<PermissionSlug[]> {
  if (!roleIds.length) return [];
  const roles = await rolesCol()
    .find({ _id: { $in: roleIds } } as { _id: { $in: import('mongodb').ObjectId[] } })
    .toArray();
  const set = new Set<PermissionSlug>();
  for (const role of roles) {
    for (const perm of role.permissions) set.add(perm);
  }
  return [...set];
}

export async function findRolesByIds(ids: ObjectId[]): Promise<RoleDoc[]> {
  if (!ids.length) return [];
  return rolesCol()
    .find({ _id: { $in: ids } } as { _id: { $in: ObjectId[] } })
    .toArray();
}
