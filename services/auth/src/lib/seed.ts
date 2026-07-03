import { DEFAULT_ADMIN_MENU_SEEDS, DEFAULT_ROLE_SEEDS, PERMISSIONS } from '@vokop/shared';
import { AUTH_CONFIG } from '../config.js';
import { hashPassword } from '../lib/password.js';
import { createMenu, listMenus, updateMenu } from '../db/adminMenus.js';
import { createRole, findRoleBySlug, listRoles } from '../db/roles.js';
import { createUser, ensureAuthIndexes, findUserByEmail } from '../db/users.js';

export async function seedAuthData(): Promise<void> {
  await ensureAuthIndexes();

  const existingRoles = await listRoles();
  if (existingRoles.length === 0) {
    for (const seed of DEFAULT_ROLE_SEEDS) {
      await createRole({
        slug: seed.slug,
        label: seed.label,
        description: seed.description,
        permissions: [...seed.permissions],
        isSystem: seed.isSystem,
      });
    }
    console.log('[auth] seeded default roles');
  }

  const existingMenus = await listMenus();
  if (existingMenus.length === 0) {
    for (const seed of DEFAULT_ADMIN_MENU_SEEDS) {
      await createMenu({
        label: seed.label,
        path: seed.path,
        icon: seed.icon,
        parentId: seed.parentId,
        order: seed.order,
        permission: seed.permission,
        visible: seed.visible,
      });
    }
    console.log('[auth] seeded admin menus');
  } else {
    const legacyPaths: Record<string, string> = {
      '/admin': '/',
      '/admin/users': '/users',
      '/admin/rbac': '/rbac',
      '/admin/menus': '/menus',
    };

    for (const menu of existingMenus) {
      const nextPath = legacyPaths[menu.path];
      if (nextPath) {
        await updateMenu(menu._id.toString(), { path: nextPath });
      }
    }
  }

  const adminRole = await findRoleBySlug('super_admin');
  const existingAdmin = await findUserByEmail(AUTH_CONFIG.adminSeedEmail);
  if (!existingAdmin && adminRole) {
    await createUser({
      email: AUTH_CONFIG.adminSeedEmail,
      name: AUTH_CONFIG.adminSeedName,
      passwordHash: await hashPassword(AUTH_CONFIG.adminSeedPassword),
      kind: 'admin',
      status: 'active',
      roleIds: [adminRole._id],
    });
    console.log(`[auth] seeded admin user ${AUTH_CONFIG.adminSeedEmail}`);
  }

  void PERMISSIONS;
}
