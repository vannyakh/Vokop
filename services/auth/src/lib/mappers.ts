import type { ObjectId } from 'mongodb';
import type { AuthUser, PermissionSlug, RoleDefinition, UserKind, UserStatus } from '@vokop/shared';

export interface UserDoc {
  _id: ObjectId;
  email: string;
  name: string;
  passwordHash?: string;
  kind: UserKind;
  status: UserStatus;
  roleIds: ObjectId[];
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleDoc {
  _id: ObjectId;
  slug: string;
  label: string;
  description?: string;
  permissions: PermissionSlug[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toIso(date: Date): string {
  return date.toISOString();
}

export function mapRole(doc: RoleDoc): RoleDefinition {
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    label: doc.label,
    description: doc.description,
    permissions: doc.permissions,
    isSystem: doc.isSystem,
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

export function mapUser(doc: UserDoc, permissions: PermissionSlug[], roleIds: string[]): AuthUser {
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    kind: doc.kind,
    status: doc.status,
    roleIds,
    permissions,
    avatarUrl: doc.avatarUrl,
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}
