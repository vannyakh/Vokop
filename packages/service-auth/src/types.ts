import type { ObjectId } from 'mongodb';
import type { PermissionSlug, UserKind, UserStatus } from '@vokop/shared';

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
