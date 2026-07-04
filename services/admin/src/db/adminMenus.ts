import { ObjectId } from 'mongodb';
import { getMongo } from '@vokop/db';
import type { PermissionSlug } from '@vokop/shared';
import type { AdminMenuDoc } from '../lib/mappers.js';

export const ADMIN_MENUS = 'admin_menus';

export function menusCol() {
  return getMongo().collection<AdminMenuDoc>(ADMIN_MENUS);
}

export async function listMenus(): Promise<AdminMenuDoc[]> {
  return menusCol().find().sort({ order: 1 }).toArray();
}

export async function findMenuById(id: string): Promise<AdminMenuDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  return menusCol().findOne({ _id: new ObjectId(id) });
}

export async function createMenu(input: {
  label: string;
  path: string;
  icon?: string;
  parentId?: string | null;
  order?: number;
  permission?: PermissionSlug | null;
  visible?: boolean;
}): Promise<AdminMenuDoc> {
  const now = new Date();
  const doc: AdminMenuDoc = {
    _id: new ObjectId(),
    label: input.label,
    path: input.path,
    icon: input.icon,
    parentId: input.parentId && ObjectId.isValid(input.parentId) ? new ObjectId(input.parentId) : null,
    order: input.order ?? 0,
    permission: input.permission ?? null,
    visible: input.visible ?? true,
    createdAt: now,
    updatedAt: now,
  };
  await menusCol().insertOne(doc);
  return doc;
}

export async function updateMenu(
  id: string,
  patch: Partial<
    Pick<AdminMenuDoc, 'label' | 'path' | 'icon' | 'order' | 'permission' | 'visible'> & {
      parentId?: string | null;
    }
  >,
): Promise<AdminMenuDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  const $set: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.label !== undefined) $set.label = patch.label;
  if (patch.path !== undefined) $set.path = patch.path;
  if (patch.icon !== undefined) $set.icon = patch.icon;
  if (patch.order !== undefined) $set.order = patch.order;
  if (patch.permission !== undefined) $set.permission = patch.permission;
  if (patch.visible !== undefined) $set.visible = patch.visible;
  if (patch.parentId !== undefined) {
    $set.parentId =
      patch.parentId && ObjectId.isValid(patch.parentId) ? new ObjectId(patch.parentId) : null;
  }

  const result = await menusCol().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set },
    { returnDocument: 'after' },
  );
  return result ?? null;
}

export async function deleteMenu(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await menusCol().deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

export async function ensureAdminIndexes(): Promise<void> {
  await menusCol().createIndex({ path: 1 }, { unique: true });
}
