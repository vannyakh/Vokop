import { PERMISSIONS } from '@vokop/shared';
import { buildMenuTree, mapMenu, mapRole, mapUser } from '../lib/mappers.js';
import { createMenu, deleteMenu, listMenus, updateMenu } from '../db/adminMenus.js';
import { createRole, deleteRole, listRoles, updateRole } from '../db/roles.js';
import { listUsers, resolvePermissions, updateUser, findUserById } from '../db/users.js';

export async function getPermissionsCatalog() {
  return PERMISSIONS;
}

export async function getAdminMenuTree(userPermissions: string[]) {
  const menus = (await listMenus())
    .filter((m) => m.visible)
    .filter((m) => !m.permission || userPermissions.includes(m.permission))
    .map(mapMenu);
  return buildMenuTree(menus);
}

export async function getRoles() {
  return (await listRoles()).map(mapRole);
}

export async function createRoleRecord(input: {
  slug: string;
  label: string;
  description?: string;
  permissions: Parameters<typeof createRole>[0]['permissions'];
}) {
  return mapRole(await createRole({ ...input, isSystem: false }));
}

export async function updateRoleRecord(
  id: string,
  input: Partial<{ slug: string; label: string; description: string; permissions: Parameters<typeof createRole>[0]['permissions'] }>,
) {
  const role = await updateRole(id, input);
  if (!role) throw new Error('Role not found');
  return mapRole(role);
}

export async function removeRole(id: string) {
  const ok = await deleteRole(id);
  if (!ok) throw new Error('Cannot delete system or missing role');
}

export async function getUsers() {
  const users = await listUsers();
  return Promise.all(
    users.map(async (user) => {
      const permissions = await resolvePermissions(user.roleIds);
      return mapUser(
        user,
        permissions,
        user.roleIds.map((id) => id.toString()),
      );
    }),
  );
}

export async function updateUserRecord(
  id: string,
  input: { roleIds?: string[]; status?: 'active' | 'disabled' | 'pending' },
) {
  const { ObjectId } = await import('mongodb');
  const user = await updateUser(id, {
    status: input.status,
    roleIds: input.roleIds?.map((rid) => new ObjectId(rid)),
  });
  if (!user) throw new Error('User not found');
  const permissions = await resolvePermissions(user.roleIds);
  return mapUser(
    user,
    permissions,
    user.roleIds.map((rid) => rid.toString()),
  );
}

export async function createMenuRecord(input: Parameters<typeof createMenu>[0]) {
  return mapMenu(await createMenu(input));
}

export async function updateMenuRecord(id: string, input: Parameters<typeof updateMenu>[1]) {
  const menu = await updateMenu(id, input);
  if (!menu) throw new Error('Menu not found');
  return mapMenu(menu);
}

export async function removeMenu(id: string) {
  const ok = await deleteMenu(id);
  if (!ok) throw new Error('Menu not found');
}

export async function assertUserExists(id: string) {
  const user = await findUserById(id);
  if (!user) throw new Error('User not found');
}
