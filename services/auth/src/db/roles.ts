import { ObjectId } from 'mongodb';
import type { PermissionSlug } from '@vokop/shared';
import type { RoleDoc } from '../lib/mappers.js';
import { rolesCol } from './users.js';

export async function listRoles(): Promise<RoleDoc[]> {
  return rolesCol().find().sort({ slug: 1 }).toArray();
}

export async function findRoleById(id: string): Promise<RoleDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  return rolesCol().findOne({ _id: new ObjectId(id) });
}

export async function findRoleBySlug(slug: string): Promise<RoleDoc | null> {
  return rolesCol().findOne({ slug });
}

export async function createRole(input: {
  slug: string;
  label: string;
  description?: string;
  permissions: PermissionSlug[];
  isSystem?: boolean;
}): Promise<RoleDoc> {
  const now = new Date();
  const doc: RoleDoc = {
    _id: new ObjectId(),
    slug: input.slug,
    label: input.label,
    description: input.description,
    permissions: input.permissions,
    isSystem: input.isSystem ?? false,
    createdAt: now,
    updatedAt: now,
  };
  await rolesCol().insertOne(doc);
  return doc;
}

export async function updateRole(
  id: string,
  patch: Partial<Pick<RoleDoc, 'label' | 'description' | 'permissions' | 'slug'>>,
): Promise<RoleDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  const result = await rolesCol().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
  return result ?? null;
}

export async function deleteRole(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const role = await findRoleById(id);
  if (!role || role.isSystem) return false;
  const result = await rolesCol().deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}
