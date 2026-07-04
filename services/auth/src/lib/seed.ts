import { DEFAULT_ROLE_SEEDS, PERMISSIONS } from '@vokop/shared';
import { AUTH_CONFIG } from '../config.js';
import { hashPassword } from '../lib/password.js';
import { createRole, findRoleBySlug, listRoles } from '../db/roles.js';
import { createUser, ensureAuthIndexes, findUserByEmail } from '../db/users.js';

/** Seed roles + platform admin user only (account/security). */
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
