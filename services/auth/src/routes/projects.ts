import { Router } from 'express';
import { authenticate, type AuthedRequest } from '../middleware/auth.js';
import {
  createUserProject,
  emptyUserTrash,
  getUserProject,
  getUserProjects,
  getUserTrashProjects,
  parseCreateProjectBody,
  parseUpdateProjectBody,
  permanentDeleteUserProject,
  restoreUserProject,
  trashUserProject,
  updateUserProject,
} from '../services/projectService.js';

export function createProjectsRouter(): Router {
  const router = Router();
  router.use(authenticate);

  // Active projects
  router.get('/', async (req: AuthedRequest, res) => {
    try {
      const payload = await getUserProjects(req.auth!.userId);
      res.json(payload);
    } catch (err) {
      console.error('[auth] list projects failed:', err);
      res.status(500).json({ error: 'Failed to load projects' });
    }
  });

  // Trash list (must be registered before /:projectId)
  router.get('/trash', async (req: AuthedRequest, res) => {
    try {
      const payload = await getUserTrashProjects(req.auth!.userId);
      res.json(payload);
    } catch (err) {
      console.error('[auth] list trash failed:', err);
      res.status(500).json({ error: 'Failed to load trash' });
    }
  });

  // Empty trash — permanent delete all soft-deleted projects
  router.delete('/trash', async (req: AuthedRequest, res) => {
    try {
      const payload = await emptyUserTrash(req.auth!.userId);
      res.json(payload);
    } catch (err) {
      console.error('[auth] empty trash failed:', err);
      res.status(500).json({ error: 'Failed to empty trash' });
    }
  });

  router.post('/', async (req: AuthedRequest, res) => {
    try {
      const parsed = parseCreateProjectBody(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid project payload',
          details: parsed.error.flatten(),
        });
        return;
      }

      const payload = await createUserProject(req.auth!.userId, parsed.data);
      res.status(201).json(payload);
    } catch (err) {
      console.error('[auth] create project failed:', err);
      res.status(500).json({ error: 'Failed to create project' });
    }
  });

  router.get('/:projectId', async (req: AuthedRequest, res) => {
    try {
      const payload = await getUserProject(req.auth!.userId, req.params.projectId);
      if (!payload) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      res.json(payload);
    } catch (err) {
      console.error('[auth] get project failed:', err);
      res.status(500).json({ error: 'Failed to load project' });
    }
  });

  router.patch('/:projectId', async (req: AuthedRequest, res) => {
    try {
      const parsed = parseUpdateProjectBody(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid project payload',
          details: parsed.error.flatten(),
        });
        return;
      }

      if (Object.keys(parsed.data).length === 0) {
        res.status(400).json({ error: 'No project fields to update' });
        return;
      }

      const payload = await updateUserProject(
        req.auth!.userId,
        req.params.projectId,
        parsed.data,
      );
      if (!payload) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      res.json(payload);
    } catch (err) {
      console.error('[auth] update project failed:', err);
      res.status(500).json({ error: 'Failed to update project' });
    }
  });

  // Soft-delete → trash
  router.delete('/:projectId', async (req: AuthedRequest, res) => {
    try {
      const payload = await trashUserProject(req.auth!.userId, req.params.projectId);
      if (!payload) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      res.json(payload);
    } catch (err) {
      console.error('[auth] trash project failed:', err);
      res.status(500).json({ error: 'Failed to move project to trash' });
    }
  });

  // Restore from trash
  router.post('/:projectId/restore', async (req: AuthedRequest, res) => {
    try {
      const payload = await restoreUserProject(req.auth!.userId, req.params.projectId);
      if (!payload) {
        res.status(404).json({ error: 'Project not found in trash' });
        return;
      }
      res.json(payload);
    } catch (err) {
      console.error('[auth] restore project failed:', err);
      res.status(500).json({ error: 'Failed to restore project' });
    }
  });

  // Permanent delete (trash only)
  router.delete('/:projectId/permanent', async (req: AuthedRequest, res) => {
    try {
      const ok = await permanentDeleteUserProject(req.auth!.userId, req.params.projectId);
      if (!ok) {
        res.status(404).json({ error: 'Project not found in trash' });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      console.error('[auth] permanent delete failed:', err);
      res.status(500).json({ error: 'Failed to permanently delete project' });
    }
  });

  return router;
}
