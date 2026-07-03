import { Router } from 'express';
import {
  handleCreateProject,
  handleDeleteProject,
  handleGetProject,
  handleListProjects,
  handleSaveTimeline,
  handleUpdateProject,
} from './handlers.js';

export function createProjectsRouter(): Router {
  const router = Router();

  router.get('/', handleListProjects);
  router.post('/', handleCreateProject);
  router.get('/:id', handleGetProject);
  router.patch('/:id', handleUpdateProject);
  router.patch('/:id/timeline', handleSaveTimeline);
  router.delete('/:id', handleDeleteProject);

  return router;
}
