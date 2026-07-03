import type { Request, Response } from 'express';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  saveTimeline,
  updateProjectMeta,
} from './service.js';

function ownerId(req: Request): string {
  // Set by lib/auth.ts verifyToken middleware
  return (req as Request & { userId?: string }).userId ?? 'anonymous';
}

export async function handleListProjects(req: Request, res: Response): Promise<void> {
  const projects = await listProjects(ownerId(req));
  res.json({ projects });
}

export async function handleCreateProject(req: Request, res: Response): Promise<void> {
  const { name = 'Untitled', timeline } = req.body as Record<string, unknown>;
  if (typeof name !== 'string') {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const doc = await createProject(ownerId(req), name, (timeline as Record<string, unknown>) ?? {});
  res.status(201).json({ project: doc });
}

export async function handleGetProject(req: Request, res: Response): Promise<void> {
  const doc = await getProject(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json({ project: doc });
}

export async function handleUpdateProject(req: Request, res: Response): Promise<void> {
  const { name } = req.body as { name?: string };
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const doc = await updateProjectMeta(req.params.id, ownerId(req), name);
  if (!doc) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json({ project: doc });
}

export async function handleSaveTimeline(req: Request, res: Response): Promise<void> {
  const { timeline, version } = req.body as { timeline?: Record<string, unknown>; version?: number };
  if (!timeline || typeof version !== 'number') {
    res.status(400).json({ error: 'timeline and version are required' });
    return;
  }

  try {
    const { doc, version: newVersion } = await saveTimeline(
      req.params.id,
      ownerId(req),
      timeline,
      version,
    );
    res.json({ project: doc, version: newVersion });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
}

export async function handleDeleteProject(req: Request, res: Response): Promise<void> {
  const deleted = await deleteProject(req.params.id, ownerId(req));
  if (!deleted) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.status(204).send();
}
