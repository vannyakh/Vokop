import { Router } from 'express';
import {
  adminMenusResponseSchema,
  permissionsListResponseSchema,
  rolesListResponseSchema,
  toApiResponse,
  updateUserRolesRequestSchema,
  upsertAdminMenuRequestSchema,
  upsertRoleRequestSchema,
  usersListResponseSchema,
} from '@vokop/api';
import { authenticate, requirePermission, type AuthedRequest } from '../middleware/auth.js';
import {
  createMenuRecord,
  createRoleRecord,
  getAdminMenuTree,
  getPermissionsCatalog,
  getRoles,
  getUsers,
  removeMenu,
  removeRole,
  updateMenuRecord,
  updateRoleRecord,
  updateUserRecord,
} from '../services/adminService.js';

export function createAdminRouter(): Router {
  const router = Router();
  router.use(authenticate);

  router.get('/menus', requirePermission('menus.read', 'admin.access'), async (req: AuthedRequest, res) => {
    const menus = await getAdminMenuTree(req.auth!.permissions);
    res.json(toApiResponse(adminMenusResponseSchema, { menus }));
  });

  router.post('/menus', requirePermission('menus.write'), async (req, res) => {
    const parsed = upsertAdminMenuRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid menu payload' });
      return;
    }
    try {
      const menu = await createMenuRecord(parsed.data);
      res.status(201).json({ menu });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Create failed' });
    }
  });

  router.patch('/menus/:id', requirePermission('menus.write'), async (req, res) => {
    try {
      const menu = await updateMenuRecord(req.params.id, req.body);
      res.json({ menu });
    } catch {
      res.status(404).json({ error: 'Menu not found' });
    }
  });

  router.delete('/menus/:id', requirePermission('menus.write'), async (req, res) => {
    try {
      await removeMenu(req.params.id);
      res.json({ ok: true as const });
    } catch {
      res.status(404).json({ error: 'Menu not found' });
    }
  });

  router.get('/permissions', requirePermission('roles.read'), async (_req, res) => {
    const permissions = await getPermissionsCatalog();
    res.json(toApiResponse(permissionsListResponseSchema, { permissions }));
  });

  router.get('/roles', requirePermission('roles.read'), async (_req, res) => {
    const roles = await getRoles();
    res.json(toApiResponse(rolesListResponseSchema, { roles }));
  });

  router.post('/roles', requirePermission('roles.write'), async (req, res) => {
    const parsed = upsertRoleRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid role payload' });
      return;
    }
    try {
      const role = await createRoleRecord(parsed.data);
      res.status(201).json({ role });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Create failed' });
    }
  });

  router.patch('/roles/:id', requirePermission('roles.write'), async (req, res) => {
    try {
      const role = await updateRoleRecord(req.params.id, req.body);
      res.json({ role });
    } catch {
      res.status(404).json({ error: 'Role not found' });
    }
  });

  router.delete('/roles/:id', requirePermission('roles.write'), async (req, res) => {
    try {
      await removeRole(req.params.id);
      res.json({ ok: true as const });
    } catch {
      res.status(400).json({ error: 'Cannot delete role' });
    }
  });

  router.get('/users', requirePermission('users.read'), async (_req, res) => {
    const users = await getUsers();
    res.json(toApiResponse(usersListResponseSchema, { users }));
  });

  router.patch('/users/:id', requirePermission('users.write'), async (req, res) => {
    const parsed = updateUserRolesRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid user payload' });
      return;
    }
    try {
      const user = await updateUserRecord(req.params.id, parsed.data);
      res.json({ user });
    } catch {
      res.status(404).json({ error: 'User not found' });
    }
  });

  return router;
}
