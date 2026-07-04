import { DEFAULT_ADMIN_MENU_SEEDS } from '@vokop/shared';
import { createMenu, ensureAdminIndexes, listMenus, updateMenu } from '../db/adminMenus.js';

export async function seedAdminData(): Promise<void> {
  await ensureAdminIndexes();

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
    console.log('[admin] seeded admin menus');
    return;
  }

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
