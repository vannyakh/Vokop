import type { ObjectId } from 'mongodb';
import type { AdminMenuTreeItem } from '@vokop/api';
import type { AdminMenuItem, AuthUser, PermissionSlug, RoleDefinition, UserKind, UserStatus } from '@vokop/shared';

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

export interface AdminMenuDoc {
  _id: ObjectId;
  label: string;
  path: string;
  icon?: string;
  parentId: ObjectId | null;
  order: number;
  permission: PermissionSlug | null;
  visible: boolean;
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

export function mapMenu(doc: AdminMenuDoc): AdminMenuItem {
  return {
    id: doc._id.toString(),
    label: doc.label,
    path: doc.path,
    icon: doc.icon,
    parentId: doc.parentId?.toString() ?? null,
    order: doc.order,
    permission: doc.permission,
    visible: doc.visible,
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

export function buildMenuTree(items: AdminMenuItem[]): AdminMenuTreeItem[] {
  const byId = new Map<string, AdminMenuTreeItem>(
    items.map((item) => [item.id, { ...item, children: [] }]),
  );
  const roots: AdminMenuTreeItem[] = [];

  for (const item of byId.values()) {
    if (item.parentId && byId.has(item.parentId)) {
      byId.get(item.parentId)!.children.push(item);
    } else {
      roots.push(item);
    }
  }

  const sortRec = (nodes: AdminMenuTreeItem[]) => {
    nodes.sort((a, b) => a.order - b.order);
    for (const node of nodes) sortRec(node.children);
  };
  sortRec(roots);
  return roots;
}
